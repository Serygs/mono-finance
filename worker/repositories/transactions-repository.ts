import type {
  TransactionListInput,
  TransactionListItem,
  TransactionListResult,
  TransactionQueryRepository,
} from '../services/transaction-query-service'

interface TransactionRow {
  account_id: string
  account_type: string
  card_masked_pan: string | null
  category_id: string | null
  category_name: string | null
  custom_category_id: string | null
  custom_category_name: string | null
  mapped_category_id: string | null
  mapped_category_name: string | null
  effective_amount_minor: number
  has_adjustment: number
  has_compensation: number
  id: string
  is_excluded: number
  original_amount_minor: number
  original_currency_code: string
  currency_minor_unit: number
  original_description: string
  original_mcc: number | null
  original_timestamp: number
  adjustment_note: string | null
  exclusion_reason: string | null
}

interface TransactionCursor {
  id: string
  timestamp: number
}

export class D1TransactionsRepository implements TransactionQueryRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async list(input: TransactionListInput): Promise<TransactionListResult> {
    const cursor = input.cursor === null ? null : decodeCursor(input.cursor)
    const conditions = ['transactions.user_id = ?']
    const bindings: (number | string)[] = [input.userId]

    if (input.accountIds.length > 0) {
      conditions.push(
        `transactions.account_id IN (${input.accountIds.map(() => '?').join(', ')})`,
      )
      bindings.push(...input.accountIds)
    }
    if (input.dateFrom !== null) {
      conditions.push('transactions.original_timestamp >= ?')
      bindings.push(input.dateFrom)
    }
    if (input.dateTo !== null) {
      conditions.push('transactions.original_timestamp <= ?')
      bindings.push(input.dateTo)
    }
    if (input.direction !== null) {
      conditions.push('transactions.direction = ?')
      bindings.push(input.direction)
    }
    if (input.currency !== null) {
      conditions.push('transactions.original_currency_code = ?')
      bindings.push(input.currency)
    }
    if (input.category !== null) {
      conditions.push(
        'COALESCE(override_categories.name, mapped_categories.name, transactions.original_category_name) = ?',
      )
      bindings.push(input.category)
    }
    if (input.excluded !== null) {
      conditions.push('COALESCE(transaction_exclusions.is_excluded, 0) = ?')
      bindings.push(input.excluded ? 1 : 0)
    }
    if (input.search !== null) {
      conditions.push(
        "LOWER(transactions.original_description) LIKE ? ESCAPE '\\'",
      )
      bindings.push(`%${escapeLike(input.search.toLowerCase())}%`)
    }
    if (cursor !== null) {
      conditions.push(
        '(transactions.original_timestamp < ? OR (transactions.original_timestamp = ? AND transactions.id < ?))',
      )
      bindings.push(cursor.timestamp, cursor.timestamp, cursor.id)
    }

    const result = await this.database
      .prepare(
        `SELECT
           transactions.id,
           transactions.original_amount_minor,
           transactions.original_currency_code,
           currencies.minor_unit AS currency_minor_unit,
           transactions.original_description,
           transactions.original_mcc,
           transactions.original_timestamp,
           transactions.original_category_code AS category_id,
           transactions.original_category_name AS category_name,
           COALESCE(transaction_adjustments.adjusted_amount_minor, transactions.original_amount_minor) AS effective_amount_minor,
           CASE WHEN transaction_adjustments.id IS NULL THEN 0 ELSE 1 END AS has_adjustment,
           transaction_adjustments.note AS adjustment_note,
           CASE WHEN transaction_exclusions.is_excluded = 1 THEN 1 ELSE 0 END AS is_excluded,
           transaction_exclusions.reason AS exclusion_reason,
           CASE WHEN EXISTS (
             SELECT 1 FROM compensation_links
             WHERE compensation_links.expense_transaction_id = transactions.id
                OR compensation_links.compensation_transaction_id = transactions.id
           ) THEN 1 ELSE 0 END AS has_compensation,
           accounts.id AS account_id,
           accounts.type AS account_type,
           account_cards.masked_pan AS card_masked_pan,
           override_categories.id AS custom_category_id,
           override_categories.name AS custom_category_name,
           mapped_categories.id AS mapped_category_id,
           mapped_categories.name AS mapped_category_name
         FROM transactions
         INNER JOIN accounts ON accounts.id = transactions.account_id
         INNER JOIN currencies ON currencies.code = transactions.original_currency_code
         LEFT JOIN account_cards ON account_cards.id = transactions.account_card_id
         LEFT JOIN transaction_adjustments ON transaction_adjustments.transaction_id = transactions.id
         LEFT JOIN transaction_exclusions ON transaction_exclusions.transaction_id = transactions.id
         LEFT JOIN transaction_category_overrides
           ON transaction_category_overrides.transaction_id = transactions.id
         LEFT JOIN categories AS override_categories
           ON override_categories.id = transaction_category_overrides.category_id
         LEFT JOIN category_source_mappings
           ON category_source_mappings.user_id = transactions.user_id
          AND category_source_mappings.original_category_code = transactions.original_category_code
         LEFT JOIN categories AS mapped_categories
           ON mapped_categories.id = category_source_mappings.category_id
         WHERE ${conditions.join('\n           AND ')}
         ORDER BY transactions.original_timestamp DESC, transactions.id DESC
         LIMIT ?`,
      )
      .bind(...bindings, input.limit + 1)
      .all<TransactionRow>()
    const rows = result.results
    const pageRows = rows.slice(0, input.limit)
    const last = pageRows.at(-1)
    return {
      nextCursor:
        rows.length > input.limit && last !== undefined
          ? encodeCursor({ id: last.id, timestamp: last.original_timestamp })
          : null,
      transactions: pageRows.map(mapTransactionRow),
    }
  }
}

function mapTransactionRow(row: TransactionRow): TransactionListItem {
  const hasCustomCategory =
    row.custom_category_id !== null && row.custom_category_name !== null
  const hasMappedCategory =
    row.mapped_category_id !== null && row.mapped_category_name !== null
  return {
    account: {
      id: row.account_id,
      maskedPan: row.card_masked_pan,
      type: row.account_type,
    },
    category: hasCustomCategory
      ? {
          id: row.custom_category_id,
          name: row.custom_category_name,
          source: 'custom',
        }
      : hasMappedCategory
        ? {
            id: row.mapped_category_id,
            name: row.mapped_category_name,
            source: 'mapped',
          }
        : row.category_name === null
          ? { id: null, name: null, source: null }
          : {
              id: row.category_id,
              name: row.category_name,
              source: 'original',
            },
    originalCategory: { id: row.category_id, name: row.category_name },
    currencyCode: row.original_currency_code,
    currencyMinorUnit: row.currency_minor_unit,
    effectiveAmountMinor: row.effective_amount_minor,
    adjustmentNote: row.adjustment_note,
    hasAdjustment: row.has_adjustment === 1,
    hasCompensation: row.has_compensation === 1,
    id: row.id,
    isExcluded: row.is_excluded === 1,
    exclusionReason: row.exclusion_reason,
    originalAmountMinor: row.original_amount_minor,
    originalDescription: row.original_description,
    originalMcc: row.original_mcc,
    originalTimestamp: row.original_timestamp,
  }
}

function escapeLike(value: string): string {
  return value
    .replaceAll('\\', '\\\\')
    .replaceAll('%', '\\%')
    .replaceAll('_', '\\_')
}

function encodeCursor(cursor: TransactionCursor): string {
  return btoa(JSON.stringify(cursor))
}

function decodeCursor(value: string): TransactionCursor {
  try {
    const parsed: unknown = JSON.parse(atob(value))
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as TransactionCursor).id === 'string' &&
      Number.isSafeInteger((parsed as TransactionCursor).timestamp)
    ) {
      return parsed as TransactionCursor
    }
  } catch {
    // The route already limits cursor size; malformed cursors simply have no valid shape.
  }
  throw new Error('Invalid transaction cursor.')
}
