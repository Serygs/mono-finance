export const MAXIMUM_STATEMENT_WINDOW_SECONDS = 2_682_000
export const INCREMENTAL_SYNC_OVERLAP_SECONDS = 86_400

interface NextTransactionSyncWindowInput {
  backfillCursorAt: number | null
  historicalStartAt: number
  lastSyncedTransactionAt: number | null
  nowEpochSeconds: number
}

export interface TransactionSyncWindow {
  fromEpochSeconds: number
  toEpochSeconds: number
}

export function nextTransactionSyncWindow(
  input: NextTransactionSyncWindowInput,
): TransactionSyncWindow | null {
  if (input.backfillCursorAt === null) {
    return historicalWindow(input.historicalStartAt, input.nowEpochSeconds)
  }

  if (input.backfillCursorAt > input.historicalStartAt) {
    return historicalWindow(input.historicalStartAt, input.backfillCursorAt)
  }

  if (
    input.lastSyncedTransactionAt === null ||
    input.nowEpochSeconds <= input.lastSyncedTransactionAt
  ) {
    return null
  }

  return {
    fromEpochSeconds: Math.max(
      input.historicalStartAt,
      input.lastSyncedTransactionAt - INCREMENTAL_SYNC_OVERLAP_SECONDS,
      input.nowEpochSeconds - MAXIMUM_STATEMENT_WINDOW_SECONDS,
    ),
    toEpochSeconds: input.nowEpochSeconds,
  }
}

function historicalWindow(
  historicalStartAt: number,
  toEpochSeconds: number,
): TransactionSyncWindow | null {
  if (toEpochSeconds <= historicalStartAt) {
    return null
  }
  return {
    fromEpochSeconds: Math.max(
      historicalStartAt,
      toEpochSeconds - MAXIMUM_STATEMENT_WINDOW_SECONDS,
    ),
    toEpochSeconds,
  }
}
