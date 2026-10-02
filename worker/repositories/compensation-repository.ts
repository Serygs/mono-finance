import type {
  CompensationLinkRecord,
  CompensationRepository,
  CompensationTransaction,
} from '../services/compensation-service'

interface TransactionRow {
  direction: 'expense' | 'income'
  id: string
  original_amount_minor: number
  original_currency_code: string
  original_description: string
  original_timestamp: number
}
interface LinkRow {
  compensated_amount_minor: number
  compensation_transaction_id: string
  created_at: number
  description: string
  expense_transaction_id: string
  id: string
  original_amount_minor: number
  original_timestamp: number
}

export class D1CompensationRepository implements CompensationRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }
  async findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<CompensationTransaction | null> {
    const row = await this.database
      .prepare(
        `SELECT id, direction, original_amount_minor, original_currency_code, original_description, original_timestamp FROM transactions WHERE id = ? AND user_id = ?`,
      )
      .bind(transactionId, userId)
      .first<TransactionRow>()
    return row === null ? null : transaction(row)
  }
  async findExpenseLinks(
    expenseTransactionId: string,
    userId: string,
  ): Promise<CompensationLinkRecord[]> {
    return this.findLinks(
      'expense_transaction_id',
      expenseTransactionId,
      userId,
    )
  }
  async findIncomeLinks(
    compensationTransactionId: string,
    userId: string,
  ): Promise<CompensationLinkRecord[]> {
    return this.findLinks(
      'compensation_transaction_id',
      compensationTransactionId,
      userId,
    )
  }
  async findIncomeCandidates(
    userId: string,
    currencyCode: string,
  ): Promise<CompensationTransaction[]> {
    const rows = await this.database
      .prepare(
        `SELECT id, direction, original_amount_minor, original_currency_code, original_description, original_timestamp FROM transactions WHERE user_id = ? AND direction = 'income' AND original_currency_code = ? AND NOT EXISTS (SELECT 1 FROM compensation_links WHERE compensation_links.compensation_transaction_id = transactions.id) ORDER BY original_timestamp DESC, id DESC LIMIT 100`,
      )
      .bind(userId, currencyCode)
      .all<TransactionRow>()
    return (rows.results ?? []).map(transaction)
  }
  async createLink(input: {
    compensatedAmountMinor: number
    compensationTransactionId: string
    currencyCode: string
    expenseTransactionId: string
    userId: string
  }): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1_000)
    await this.database
      .prepare(
        `INSERT INTO compensation_links (id, expense_transaction_id, compensation_transaction_id, user_id, compensated_amount_minor, currency_code, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.expenseTransactionId,
        input.compensationTransactionId,
        input.userId,
        input.compensatedAmountMinor,
        input.currencyCode,
        timestamp,
        timestamp,
      )
      .run()
  }
  async deleteLink(
    linkId: string,
    expenseTransactionId: string,
    userId: string,
  ): Promise<void> {
    await this.database
      .prepare(
        `DELETE FROM compensation_links WHERE id = ? AND expense_transaction_id = ? AND user_id = ?`,
      )
      .bind(linkId, expenseTransactionId, userId)
      .run()
  }
  private async findLinks(
    column: 'compensation_transaction_id' | 'expense_transaction_id',
    transactionId: string,
    userId: string,
  ): Promise<CompensationLinkRecord[]> {
    const rows = await this.database
      .prepare(
        `SELECT compensation_links.id, compensation_links.expense_transaction_id, compensation_links.compensation_transaction_id, compensation_links.compensated_amount_minor, compensation_links.created_at, transactions.original_description AS description, transactions.original_amount_minor, transactions.original_timestamp FROM compensation_links INNER JOIN transactions ON transactions.id = compensation_links.compensation_transaction_id WHERE compensation_links.${column} = ? AND compensation_links.user_id = ? ORDER BY compensation_links.created_at ASC, compensation_links.id ASC`,
      )
      .bind(transactionId, userId)
      .all<LinkRow>()
    return (rows.results ?? []).map((row) => ({
      compensatedAmountMinor: row.compensated_amount_minor,
      compensationTransactionId: row.compensation_transaction_id,
      createdAt: row.created_at,
      description: row.description,
      expenseTransactionId: row.expense_transaction_id,
      id: row.id,
      originalAmountMinor: row.original_amount_minor,
      originalTimestamp: row.original_timestamp,
    }))
  }
}
function transaction(row: TransactionRow): CompensationTransaction {
  return {
    direction: row.direction,
    id: row.id,
    originalAmountMinor: row.original_amount_minor,
    originalCurrencyCode: row.original_currency_code,
    originalDescription: row.original_description,
    originalTimestamp: row.original_timestamp,
  }
}
