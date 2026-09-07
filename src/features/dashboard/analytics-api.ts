import type { ApiResponse } from '../../types/api'

export interface CurrencyAmount {
  amountMinor: number
  currencyCode: string
}

export interface CurrencyTotals {
  currencyCode: string
  expenseAmountMinor: number
  incomeAmountMinor: number
  netAmountMinor: number
}
export interface CurrencyConversion {
  baseCurrencyCode: string | null
  missingRateTransactionCounts: Array<{ count: number; currencyCode: string }>
  mode: 'base' | 'original'
}

export interface AnalyticsOverview {
  averageExpensePerDay: CurrencyAmount[]
  comparison: Array<{
    changeAmountMinor: number
    currencyCode: string
    currentExpenseAmountMinor: number
    previousExpenseAmountMinor: number
  }>
  compensation: Array<
    CurrencyAmount & {
      compensatedExpenseAmountMinor: number
      personalExpenseAmountMinor: number
    }
  >
  excludedTotals: Array<
    Pick<
      CurrencyTotals,
      'currencyCode' | 'expenseAmountMinor' | 'incomeAmountMinor'
    >
  >
  projectedMonthExpenses: CurrencyAmount[]
  totals: CurrencyTotals[]
  currencyConversion: CurrencyConversion
}

export interface AnalyticsBreakdowns {
  expensesByAccount: Array<CurrencyAmount & { accountId: string }>
  expensesByCategory: Array<
    CurrencyAmount & { categoryId: string | null; categoryName: string }
  >
  expensesByCurrency: CurrencyAmount[]
  incomeByCategory: Array<
    CurrencyAmount & { categoryId: string | null; categoryName: string }
  >
  largestTransactions: Array<
    CurrencyAmount & {
      description: string
      direction: 'expense' | 'income'
      timestamp: number
      transactionId: string
    }
  >
  topMerchants: Array<
    CurrencyAmount & { description: string; transactionCount: number }
  >
  currencyConversion: CurrencyConversion
}

export interface AnalyticsTrends {
  daily: TimeSeriesPoint[]
  monthly: TimeSeriesPoint[]
  spendingTrend: TimeSeriesPoint[]
  currencyConversion: CurrencyConversion
}

export interface TimeSeriesPoint extends CurrencyTotals {
  periodStart: number
}

export interface AnalyticsFilters {
  accountIds: string[]
  baseCurrencyCode?: string
  dateFrom: number
  dateTo: number
}

export function getAnalyticsOverview(filters: AnalyticsFilters) {
  return requestAnalytics<AnalyticsOverview>('/api/analytics/overview', filters)
}

export function getAnalyticsBreakdowns(filters: AnalyticsFilters) {
  return requestAnalytics<AnalyticsBreakdowns>(
    '/api/analytics/breakdowns',
    filters,
  )
}

export function getAnalyticsTrends(filters: AnalyticsFilters) {
  return requestAnalytics<AnalyticsTrends>('/api/analytics/trends', filters)
}

export async function getDashboardAnalytics(
  filters: AnalyticsFilters,
): Promise<{
  breakdowns: AnalyticsBreakdowns
  overview: AnalyticsOverview
  trends: AnalyticsTrends
}> {
  const [overview, breakdowns, trends] = await Promise.all([
    getAnalyticsOverview(filters),
    getAnalyticsBreakdowns(filters),
    getAnalyticsTrends(filters),
  ])
  return { breakdowns, overview, trends }
}

async function requestAnalytics<T>(
  path: string,
  filters: AnalyticsFilters,
): Promise<T> {
  const parameters = new URLSearchParams({
    dateFrom: filters.dateFrom.toString(),
    dateTo: filters.dateTo.toString(),
  })
  for (const accountId of filters.accountIds) {
    parameters.append('accountId', accountId)
  }
  if (filters.baseCurrencyCode !== undefined) {
    parameters.set('baseCurrency', filters.baseCurrencyCode)
  }
  const response = await fetch(`${path}?${parameters.toString()}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !('data' in payload)) {
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Analytics could not be loaded. Try again later.',
    )
  }
  return payload.data
}
