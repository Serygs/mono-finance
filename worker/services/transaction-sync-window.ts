export const MAXIMUM_STATEMENT_WINDOW_SECONDS = 2_682_000
export const INCREMENTAL_SYNC_OVERLAP_SECONDS = 86_400

interface NextTransactionSyncWindowInput {
  backfillCursorAt: number | null
  historicalStartAt: number
  lastSyncedTransactionAt: number | null
  lastSuccessfulSyncAt?: number | null
  nowEpochSeconds: number
}

export interface TransactionSyncWindow {
  fromEpochSeconds: number
  toEpochSeconds: number
}

export function latestTransactionSyncWindow(
  input: NextTransactionSyncWindowInput,
): TransactionSyncWindow | null {
  const latestSyncAt = maximumTimestamp(
    input.lastSyncedTransactionAt,
    input.lastSuccessfulSyncAt ?? null,
  )
  if (latestSyncAt !== null && input.nowEpochSeconds <= latestSyncAt) {
    return null
  }

  return {
    fromEpochSeconds: Math.max(
      input.historicalStartAt,
      input.nowEpochSeconds - MAXIMUM_STATEMENT_WINDOW_SECONDS,
      latestSyncAt === null
        ? input.historicalStartAt
        : latestSyncAt - INCREMENTAL_SYNC_OVERLAP_SECONDS,
    ),
    toEpochSeconds: input.nowEpochSeconds,
  }
}

function maximumTimestamp(
  first: number | null,
  second: number | null,
): number | null {
  if (first === null) return second
  if (second === null) return first
  return Math.max(first, second)
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
