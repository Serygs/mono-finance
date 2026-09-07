import type { MonobankClient } from '../monobank/client'
import { MonobankApiError } from '../monobank/errors'
import type { TransactionSourceRecord } from '../monobank/internal-dtos'
import {
  nextTransactionSyncWindow,
  type TransactionSyncWindow,
} from './transaction-sync-window'

const DEFAULT_HISTORICAL_BACKFILL_DAYS = 365

export interface TransactionSyncStateView {
  accountId: string
  accountType: string
  currencyCode: string
  lastErrorCode: string | null
  lastSuccessfulSyncAt: number | null
  status: 'idle' | 'running' | 'failed'
}

export interface TransactionSyncResult {
  accountId: string | null
  importedCount: number
  skippedDuplicateCount: number
  status: 'completed' | 'no_accounts' | 'synchronized'
  window: TransactionSyncWindow | null
}

export interface ClaimedTransactionSyncAccount {
  accountId: string
  accountType: string
  backfillCursorAt: number | null
  backfillStartAt: number
  currencyCode: string
  lastSyncedTransactionAt: number | null
  monobankAccountId: string
  userId: string
}

export interface TransactionImportResult {
  importedCount: number
  skippedDuplicateCount: number
}

export interface TransactionSyncRepository {
  claimNext(
    userId: string | null,
    nowEpochSeconds: number,
    historicalStartAt: number,
  ): Promise<ClaimedTransactionSyncAccount | null>
  completeEmptyWindow(accountId: string, nowEpochSeconds: number): Promise<void>
  completeWindow(input: {
    accountId: string
    backfillCursorAt: number
    lastSyncedTransactionAt: number | null
    nowEpochSeconds: number
  }): Promise<void>
  failWindow(
    accountId: string,
    errorCode: string,
    nowEpochSeconds: number,
  ): Promise<void>
  importTransactions(input: {
    accountId: string
    currencyCode: string
    transactions: TransactionSourceRecord[]
    userId: string
  }): Promise<TransactionImportResult>
  listStatusByUser(userId: string): Promise<TransactionSyncStateView[]>
}

export class TransactionSyncService {
  private readonly repository: TransactionSyncRepository
  private readonly monobankClient: MonobankClient
  private readonly nowEpochSeconds: () => number
  private readonly log: (entry: Record<string, unknown>) => void

  constructor(
    repository: TransactionSyncRepository,
    monobankClient: MonobankClient,
    options: {
      nowEpochSeconds?: () => number
      log?: (entry: Record<string, unknown>) => void
    } = {},
  ) {
    this.repository = repository
    this.monobankClient = monobankClient
    this.nowEpochSeconds =
      options.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1_000))
    this.log = options.log ?? ((entry) => console.log(JSON.stringify(entry)))
  }

  listStatus(userId: string): Promise<TransactionSyncStateView[]> {
    return this.repository.listStatusByUser(userId)
  }

  synchronizeNext(userId: string | null): Promise<TransactionSyncResult> {
    const now = this.nowEpochSeconds()
    return this.synchronizeAt(userId, now)
  }

  private async synchronizeAt(
    userId: string | null,
    nowEpochSeconds: number,
  ): Promise<TransactionSyncResult> {
    const historicalStartAt =
      nowEpochSeconds - DEFAULT_HISTORICAL_BACKFILL_DAYS * 86_400
    const account = await this.repository.claimNext(
      userId,
      nowEpochSeconds,
      historicalStartAt,
    )
    if (account === null) {
      return {
        accountId: null,
        importedCount: 0,
        skippedDuplicateCount: 0,
        status: 'no_accounts',
        window: null,
      }
    }

    const window = nextTransactionSyncWindow({
      backfillCursorAt: account.backfillCursorAt,
      historicalStartAt: account.backfillStartAt,
      lastSyncedTransactionAt: account.lastSyncedTransactionAt,
      nowEpochSeconds,
    })
    if (window === null) {
      await this.repository.completeEmptyWindow(
        account.accountId,
        nowEpochSeconds,
      )
      return {
        accountId: account.accountId,
        importedCount: 0,
        skippedDuplicateCount: 0,
        status: 'completed',
        window: null,
      }
    }

    try {
      const transactions = await this.monobankClient.getStatement({
        accountId: account.monobankAccountId,
        fromEpochSeconds: window.fromEpochSeconds,
        toEpochSeconds: window.toEpochSeconds,
      })
      const imported = await this.repository.importTransactions({
        accountId: account.accountId,
        currencyCode: account.currencyCode,
        transactions,
        userId: account.userId,
      })
      const lastSyncedTransactionAt = maximumTimestamp(
        account.lastSyncedTransactionAt,
        transactions,
      )
      await this.repository.completeWindow({
        accountId: account.accountId,
        backfillCursorAt: window.fromEpochSeconds,
        lastSyncedTransactionAt,
        nowEpochSeconds,
      })
      this.log({
        accountId: account.accountId,
        importedCount: imported.importedCount,
        message: 'transaction_sync_completed',
        skippedDuplicateCount: imported.skippedDuplicateCount,
        window,
      })
      return {
        accountId: account.accountId,
        ...imported,
        status: 'synchronized',
        window,
      }
    } catch (error) {
      const errorCode = transactionSyncErrorCode(error)
      await this.repository.failWindow(
        account.accountId,
        errorCode,
        nowEpochSeconds,
      )
      this.log({
        accountId: account.accountId,
        failures: 1,
        message: 'transaction_sync_failed',
        window,
      })
      throw error
    }
  }
}

function maximumTimestamp(
  current: number | null,
  transactions: TransactionSourceRecord[],
): number | null {
  let maximum = current
  for (const transaction of transactions) {
    if (maximum === null || transaction.occurredAtEpochSeconds > maximum) {
      maximum = transaction.occurredAtEpochSeconds
    }
  }
  return maximum
}

function transactionSyncErrorCode(error: unknown): string {
  if (error instanceof MonobankApiError) {
    return error.code
  }
  return 'internal_error'
}
