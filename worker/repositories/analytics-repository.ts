import type {
  AnalyticsFilters,
  AnalyticsRepository,
  ResolvedAnalyticsTransaction,
} from '../services/analytics-service'
import type { HistoricalExchangeRate } from '../analytics/currency-conversion'

interface AnalyticsRow {
  account_id: string
  category_id: string | null
  category_name: string | null
  compensation_amount_minor: number
  direction: 'expense' | 'income'
  effective_amount_minor: number
  id: string
  is_excluded: number
  original_amount_minor: number
  original_currency_code: string
  original_description: string
  original_timestamp: number
}

export class D1AnalyticsRepository implements AnalyticsRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async listExchangeRates(input: {
    currencyCodes: string[]
    dateTo: number
  }): Promise<HistoricalExchangeRate[]> {
    if (input.currencyCodes.length === 0) return []
    const placeholders = input.currencyCodes.map(() => '?').join(', ')
    const result = await this.database
      .prepare(
        `SELECT source_currency_code, target_currency_code, rate_numerator,
          rate_denominator, rate_at, source
         FROM exchange_rates
         WHERE rate_at <= ?
           AND (source_currency_code IN (${placeholders})
             OR target_currency_code IN (${placeholders}))`,
      )
      .bind(input.dateTo, ...input.currencyCodes, ...input.currencyCodes)
      .all<ExchangeRateRow>()
    return (result.results ?? []).map((row) => ({
      rateAt: row.rate_at,
      rateDenominator: row.rate_denominator,
      rateNumerator: row.rate_numerator,
      source: row.source,
      sourceCurrencyCode: row.source_currency_code,
      targetCurrencyCode: row.target_currency_code,
    }))
  }

  async listResolvedTransactions(
    filters: AnalyticsFilters,
  ): Promise<ResolvedAnalyticsTransaction[]> {
    const conditions = [
      'transactions.user_id = ?',
      'transactions.original_timestamp >= ?',
      'transactions.original_timestamp <= ?',
    ]
    const bindings: (number | string)[] = [
      filters.userId,
      filters.dateFrom,
      filters.dateTo,
    ]
    if (filters.accountIds.length > 0) {
      conditions.push(
        `transactions.account_id IN (${filters.accountIds.map(() => '?').join(', ')})`,
      )
      bindings.push(...filters.accountIds)
    }
    const result = await this.database
      .prepare(
        `SELECT transactions.id, transactions.account_id, transactions.direction,
          transactions.original_amount_minor, transactions.original_currency_code,
          transactions.original_description, transactions.original_timestamp,
          COALESCE(transaction_adjustments.adjusted_amount_minor, transactions.original_amount_minor) AS effective_amount_minor,
          CASE WHEN transaction_exclusions.is_excluded = 1 THEN 1 ELSE 0 END AS is_excluded,
          COALESCE(override_categories.id, mapped_categories.id, transactions.original_category_code) AS category_id,
          COALESCE(override_categories.name, mapped_categories.name, transactions.original_category_name) AS category_name,
          COALESCE((SELECT SUM(compensated_amount_minor) FROM compensation_links WHERE expense_transaction_id = transactions.id), 0) AS compensation_amount_minor
         FROM transactions
         LEFT JOIN transaction_adjustments ON transaction_adjustments.transaction_id = transactions.id
         LEFT JOIN transaction_exclusions ON transaction_exclusions.transaction_id = transactions.id
         LEFT JOIN transaction_category_overrides ON transaction_category_overrides.transaction_id = transactions.id
         LEFT JOIN categories AS override_categories ON override_categories.id = transaction_category_overrides.category_id
         LEFT JOIN category_source_mappings
           ON category_source_mappings.user_id = transactions.user_id
          AND category_source_mappings.original_category_code = transactions.original_category_code
         LEFT JOIN categories AS mapped_categories ON mapped_categories.id = category_source_mappings.category_id
         WHERE ${conditions.join(' AND ')}`,
      )
      .bind(...bindings)
      .all<AnalyticsRow>()
    return (result.results ?? []).map((row) => ({
      accountId: row.account_id,
      categoryId: row.category_id,
      categoryName: row.category_name,
      compensationAmountMinor: row.compensation_amount_minor,
      currencyCode: row.original_currency_code,
      direction: row.direction,
      effectiveAmountMinor: row.effective_amount_minor,
      id: row.id,
      isExcluded: row.is_excluded === 1,
      originalAmountMinor: row.original_amount_minor,
      originalDescription: row.original_description,
      originalTimestamp: row.original_timestamp,
    }))
  }
}

interface ExchangeRateRow {
  rate_at: number
  rate_denominator: number
  rate_numerator: number
  source: string
  source_currency_code: string
  target_currency_code: string
}
