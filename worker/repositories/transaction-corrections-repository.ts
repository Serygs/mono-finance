import type {
  OwnedTransactionForCorrection,
  TransactionCorrectionRepository,
} from '../services/transaction-correction-service'

interface TransactionCorrectionRow {
  adjusted_amount_minor: number | null
  direction: 'income' | 'expense'
  id: string
  is_excluded: number
  monobank_transaction_id: string
  original_amount_minor: number
  original_currency_code: string
  original_description: string
  original_mcc: number | null
  original_timestamp: number
}

export class D1TransactionCorrectionRepository implements TransactionCorrectionRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<OwnedTransactionForCorrection | null> {
    const row = await this.database
      .prepare(
        `SELECT transactions.id, transactions.direction,
           transactions.original_amount_minor, transactions.original_currency_code,
           transactions.original_description, transactions.original_mcc,
           transactions.original_timestamp, transactions.monobank_transaction_id,
           transaction_adjustments.adjusted_amount_minor,
           COALESCE(transaction_exclusions.is_excluded, 0) AS is_excluded
         FROM transactions
         LEFT JOIN transaction_adjustments
           ON transaction_adjustments.transaction_id = transactions.id
         LEFT JOIN transaction_exclusions
           ON transaction_exclusions.transaction_id = transactions.id
         WHERE transactions.id = ? AND transactions.user_id = ?`,
      )
      .bind(transactionId, userId)
      .first<TransactionCorrectionRow>()
    return row === null ? null : mapTransaction(row)
  }

  async upsertAdjustment(input: {
    adjustedAmountMinor: number
    note: string | null
    transactionId: string
    updatedAt: number
    userId: string
  }): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO transaction_adjustments (
           id, transaction_id, user_id, adjusted_amount_minor, note, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(transaction_id) DO UPDATE SET
           adjusted_amount_minor = excluded.adjusted_amount_minor,
           note = excluded.note,
           updated_at = excluded.updated_at
         WHERE transaction_adjustments.user_id = excluded.user_id`,
      )
      .bind(
        crypto.randomUUID(),
        input.transactionId,
        input.userId,
        input.adjustedAmountMinor,
        input.note,
        input.updatedAt,
        input.updatedAt,
      )
      .run()
  }

  async removeAdjustment(transactionId: string, userId: string): Promise<void> {
    await this.database
      .prepare(
        `DELETE FROM transaction_adjustments
         WHERE transaction_id = ? AND user_id = ?`,
      )
      .bind(transactionId, userId)
      .run()
  }

  async setExcluded(
    transactionId: string,
    userId: string,
    reason: string | null,
    updatedAt: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO transaction_exclusions (
           id, transaction_id, user_id, is_excluded, reason, excluded_at,
           restored_at, created_at, updated_at
         ) VALUES (?, ?, ?, 1, ?, ?, NULL, ?, ?)
         ON CONFLICT(transaction_id) DO UPDATE SET
           is_excluded = 1,
           reason = excluded.reason,
           excluded_at = excluded.excluded_at,
           restored_at = NULL,
           updated_at = excluded.updated_at
         WHERE transaction_exclusions.user_id = excluded.user_id`,
      )
      .bind(
        crypto.randomUUID(),
        transactionId,
        userId,
        reason,
        updatedAt,
        updatedAt,
        updatedAt,
      )
      .run()
  }

  async setRestored(
    transactionId: string,
    userId: string,
    updatedAt: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `UPDATE transaction_exclusions
         SET is_excluded = 0, restored_at = ?, updated_at = ?
         WHERE transaction_id = ? AND user_id = ?`,
      )
      .bind(updatedAt, updatedAt, transactionId, userId)
      .run()
  }
}

function mapTransaction(
  row: TransactionCorrectionRow,
): OwnedTransactionForCorrection {
  return {
    adjustmentAmountMinor: row.adjusted_amount_minor,
    direction: row.direction,
    id: row.id,
    isExcluded: row.is_excluded === 1,
    originalAmountMinor: row.original_amount_minor,
    originalCurrencyCode: row.original_currency_code,
    originalDescription: row.original_description,
    originalMcc: row.original_mcc,
    originalTimestamp: row.original_timestamp,
    providerTransactionId: row.monobank_transaction_id,
  }
}
