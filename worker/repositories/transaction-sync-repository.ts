import type { TransactionSourceRecord } from '../monobank/internal-dtos'
import type {
  ClaimedTransactionSyncAccount,
  TransactionImportResult,
  TransactionSyncRepository,
  TransactionSyncStateView,
} from '../services/transaction-sync-service'

const SYNC_LEASE_SECONDS = 120

interface SyncCandidateRow {
  account_id: string
  account_type: string
  backfill_cursor_at: number | null
  backfill_start_at: number | null
  currency_code: string
  last_synced_transaction_at: number | null
  monobank_account_id: string
  user_id: string
}

interface SyncStatusRow {
  account_id: string
  account_type: string
  currency_code: string
  last_error_code: string | null
  last_successful_sync_at: number | null
  status: 'idle' | 'running' | 'failed'
}

export class D1TransactionSyncRepository implements TransactionSyncRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async claimNext(
    userId: string | null,
    nowEpochSeconds: number,
    historicalStartAt: number,
  ): Promise<ClaimedTransactionSyncAccount | null> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const candidate = await this.nextCandidate(userId, nowEpochSeconds)
      if (candidate === null) {
        return null
      }
      const claimed = await this.database
        .prepare(
          `UPDATE sync_state
           SET status = 'running',
               last_attempt_at = ?,
               backfill_start_at = COALESCE(backfill_start_at, ?),
               lease_expires_at = ?,
               updated_at = ?
           WHERE account_id = ?
             AND (lease_expires_at IS NULL OR lease_expires_at <= ?)`,
        )
        .bind(
          nowEpochSeconds,
          historicalStartAt,
          nowEpochSeconds + SYNC_LEASE_SECONDS,
          nowEpochSeconds,
          candidate.account_id,
          nowEpochSeconds,
        )
        .run()
      if (claimed.meta.changes !== 1) {
        continue
      }
      return {
        accountId: candidate.account_id,
        accountType: candidate.account_type,
        backfillCursorAt: candidate.backfill_cursor_at,
        backfillStartAt: candidate.backfill_start_at ?? historicalStartAt,
        currencyCode: candidate.currency_code,
        lastSyncedTransactionAt: candidate.last_synced_transaction_at,
        monobankAccountId: candidate.monobank_account_id,
        userId: candidate.user_id,
      }
    }
    return null
  }

  async importTransactions(input: {
    accountId: string
    currencyCode: string
    transactions: TransactionSourceRecord[]
    userId: string
  }): Promise<TransactionImportResult> {
    if (input.transactions.length === 0) {
      return { importedCount: 0, skippedDuplicateCount: 0 }
    }
    const importedAt = Math.floor(Date.now() / 1_000)
    const results = await this.database.batch(
      input.transactions.map((transaction) =>
        this.database
          .prepare(
            `INSERT INTO transactions (
               id, user_id, account_id, monobank_transaction_id,
               original_amount_minor, original_currency_code,
               original_description, original_mcc, original_timestamp,
               original_category_code, original_category_name, direction, imported_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(monobank_transaction_id) DO NOTHING`,
          )
          .bind(
            crypto.randomUUID(),
            input.userId,
            input.accountId,
            transaction.providerTransactionId,
            transaction.accountAmountMinor,
            input.currencyCode,
            transaction.description,
            transaction.originalMcc,
            transaction.occurredAtEpochSeconds,
            transaction.originalMcc.toString(),
            `MCC ${transaction.originalMcc}`,
            transaction.direction,
            importedAt,
          ),
      ),
    )
    const importedCount = results.reduce(
      (count, result) => count + result.meta.changes,
      0,
    )
    return {
      importedCount,
      skippedDuplicateCount: input.transactions.length - importedCount,
    }
  }

  async completeWindow(input: {
    accountId: string
    backfillCursorAt: number
    lastSyncedTransactionAt: number | null
    nowEpochSeconds: number
  }): Promise<void> {
    await this.database
      .prepare(
        `UPDATE sync_state
         SET status = 'idle',
             backfill_cursor_at = ?,
             last_synced_transaction_at = ?,
             last_successful_sync_at = ?,
             last_error_code = NULL,
             lease_expires_at = NULL,
             updated_at = ?
         WHERE account_id = ?`,
      )
      .bind(
        input.backfillCursorAt,
        input.lastSyncedTransactionAt,
        input.nowEpochSeconds,
        input.nowEpochSeconds,
        input.accountId,
      )
      .run()
  }

  async completeEmptyWindow(
    accountId: string,
    nowEpochSeconds: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE sync_state
         SET status = 'idle',
             last_successful_sync_at = ?,
             last_error_code = NULL,
             lease_expires_at = NULL,
             updated_at = ?
         WHERE account_id = ?`,
      )
      .bind(nowEpochSeconds, nowEpochSeconds, accountId)
      .run()
  }

  async failWindow(
    accountId: string,
    errorCode: string,
    nowEpochSeconds: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE sync_state
         SET status = 'failed',
             last_error_code = ?,
             lease_expires_at = NULL,
             updated_at = ?
         WHERE account_id = ?`,
      )
      .bind(errorCode, nowEpochSeconds, accountId)
      .run()
  }

  async listStatusByUser(userId: string): Promise<TransactionSyncStateView[]> {
    const result = await this.database
      .prepare(
        `SELECT accounts.id AS account_id, accounts.type AS account_type,
           accounts.currency_code, sync_state.status, sync_state.last_error_code,
           sync_state.last_successful_sync_at
         FROM sync_state
         INNER JOIN accounts ON accounts.id = sync_state.account_id
         WHERE accounts.user_id = ?
         ORDER BY accounts.is_active DESC, accounts.created_at, accounts.id`,
      )
      .bind(userId)
      .all<SyncStatusRow>()
    return result.results.map((row) => ({
      accountId: row.account_id,
      accountType: row.account_type,
      currencyCode: row.currency_code,
      lastErrorCode: row.last_error_code,
      lastSuccessfulSyncAt: row.last_successful_sync_at,
      status: row.status,
    }))
  }

  private async nextCandidate(
    userId: string | null,
    nowEpochSeconds: number,
  ): Promise<SyncCandidateRow | null> {
    return this.database
      .prepare(
        `SELECT accounts.id AS account_id, accounts.user_id, accounts.type AS account_type,
           accounts.monobank_account_id, accounts.currency_code,
           sync_state.backfill_start_at, sync_state.backfill_cursor_at,
           sync_state.last_synced_transaction_at
         FROM sync_state
         INNER JOIN accounts ON accounts.id = sync_state.account_id
         WHERE accounts.is_active = 1
           AND (? IS NULL OR accounts.user_id = ?)
           AND (sync_state.lease_expires_at IS NULL OR sync_state.lease_expires_at <= ?)
         ORDER BY COALESCE(sync_state.last_attempt_at, 0), accounts.created_at, accounts.id
         LIMIT 1`,
      )
      .bind(userId, userId, nowEpochSeconds)
      .first<SyncCandidateRow>()
  }
}
