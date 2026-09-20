import type { MonobankClient } from '../monobank/client'
import { MonobankApiError } from '../monobank/errors'
import type { TransactionSourceRecord } from '../monobank/internal-dtos'
import {
  latestTransactionSyncWindow,
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

export interface TransactionSyncBatchResult {
  accountIds: string[]
  importedCount: number
  skippedDuplicateCount: number
  status: 'no_accounts' | 'synchronized'
}

export interface ClaimedTransactionSyncAccount {
  accountId: string
  accountType: string
  backfillCursorAt: number | null
  backfillStartAt: number
  currencyCode: string
  lastSyncedTransactionAt: number | null
  lastSuccessfulSyncAt: number | null
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
  claimNextLatest(
    userId: string,
    nowEpochSeconds: number,
    historicalStartAt: number,
    excludedAccountIds: readonly string[],
  ): Promise<ClaimedTransactionSyncAccount | null>
  completeEmptyWindow(accountId: string, nowEpochSeconds: number): Promise<void>
  completeWindow(input: {
    accountId: string
    backfillCursorAt: number
    lastSyncedTransactionAt: number | null
    nowEpochSeconds: number
  }): Promise<void>
  completeLatestWindow(input: {
    accountId: string
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

  async synchronizeLatestForAll(
    userId: string,
  ): Promise<TransactionSyncBatchResult> {
    const nowEpochSeconds = this.nowEpochSeconds()
    const historicalStartAt =
      nowEpochSeconds - DEFAULT_HISTORICAL_BACKFILL_DAYS * 86_400
    const synchronizedAccountIds: string[] = []
    let importedCount = 0
    let skippedDuplicateCount = 0

    while (true) {
      const account = await this.repository.claimNextLatest(
        userId,
        nowEpochSeconds,
        historicalStartAt,
        synchronizedAccountIds,
      )
      if (account === null) {
        return {
          accountIds: synchronizedAccountIds,
          importedCount,
          skippedDuplicateCount,
          status:
            synchronizedAccountIds.length === 0
              ? 'no_accounts'
              : 'synchronized',
        }
      }

      const result = await this.synchronizeLatestAccount(
        account,
        nowEpochSeconds,
      )
      synchronizedAccountIds.push(account.accountId)
      importedCount += result.importedCount
      skippedDuplicateCount += result.skippedDuplicateCount
    }
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

  private async synchronizeLatestAccount(
    account: ClaimedTransactionSyncAccount,
    nowEpochSeconds: number,
  ): Promise<TransactionImportResult> {
    const window = latestTransactionSyncWindow({
      backfillCursorAt: account.backfillCursorAt,
      historicalStartAt: account.backfillStartAt,
      lastSyncedTransactionAt: account.lastSyncedTransactionAt,
      lastSuccessfulSyncAt: account.lastSuccessfulSyncAt,
      nowEpochSeconds,
    })
    if (window === null) {
      await this.repository.completeEmptyWindow(
        account.accountId,
        nowEpochSeconds,
      )
      return { importedCount: 0, skippedDuplicateCount: 0 }
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
      await this.repository.completeLatestWindow({
        accountId: account.accountId,
        lastSyncedTransactionAt: maximumTimestamp(
          account.lastSyncedTransactionAt,
          transactions,
        ),
        nowEpochSeconds,
      })
      this.log({
        accountId: account.accountId,
        importedCount: imported.importedCount,
        message: 'transaction_latest_sync_completed',
        skippedDuplicateCount: imported.skippedDuplicateCount,
        window,
      })
      return imported
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
        message: 'transaction_latest_sync_failed',
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
