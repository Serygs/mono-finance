import type {
  AnalyticsBreakdowns,
  AnalyticsOverview,
  AnalyticsTrends,
  CurrencyTotals,
  TimeSeriesPoint,
} from './analytics-api'

export type DashboardDatePreset =
  | '7d'
  | '30d'
  | '90d'
  | 'current-month'
  | 'previous-month'
  | 'current-year'
  | 'custom'

export const DEFAULT_DASHBOARD_DATE_PRESET: DashboardDatePreset = '30d'

export interface DashboardRange {
  dateFrom: number
  dateTo: number
}

export interface DashboardAnalytics {
  breakdowns: AnalyticsBreakdowns
  overview: AnalyticsOverview
  trends: AnalyticsTrends
}

export type ExpenseCategory = AnalyticsBreakdowns['expensesByCategory'][number]

export function displayExpenseCategories(
  values: readonly ExpenseCategory[],
  otherCategoryName: string,
): { all: ExpenseCategory[]; initial: ExpenseCategory[] } {
  const all = [...values].sort(
    (left, right) => right.amountMinor - left.amountMinor,
  )
  const topCategories = all.slice(0, 5)
  const remainingCategories = all.slice(5)

  if (remainingCategories.length === 0) {
    return { all, initial: topCategories }
  }
  const firstRemainingCategory = remainingCategories[0]
  if (firstRemainingCategory === undefined) {
    return { all, initial: topCategories }
  }

  return {
    all,
    initial: topCategories.concat({
      amountMinor: remainingCategories.reduce(
        (total, category) => total + category.amountMinor,
        0,
      ),
      categoryId: null,
      categoryName: otherCategoryName,
      currencyCode: firstRemainingCategory.currencyCode,
    }),
  }
}

export function resolveDashboardRange(
  preset: DashboardDatePreset,
  customFrom: string,
  customTo: string,
  now = new Date(),
): DashboardRange | null {
  const todayEnd =
    localEpoch(now.getFullYear(), now.getMonth(), now.getDate() + 1) - 1
  if (preset === 'custom') {
    const dateFrom = dateInputToEpoch(customFrom)
    const dateToStart = dateInputToEpoch(customTo)
    if (dateFrom === null || dateToStart === null) return null
    return { dateFrom, dateTo: dateToStart + 86_399 }
  }
  if (preset === 'current-month') {
    return {
      dateFrom: localEpoch(now.getFullYear(), now.getMonth(), 1),
      dateTo: todayEnd,
    }
  }
  if (preset === 'previous-month') {
    return {
      dateFrom: localEpoch(now.getFullYear(), now.getMonth() - 1, 1),
      dateTo: localEpoch(now.getFullYear(), now.getMonth(), 1) - 1,
    }
  }
  if (preset === 'current-year') {
    return { dateFrom: localEpoch(now.getFullYear(), 0, 1), dateTo: todayEnd }
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { dateFrom: todayEnd - (days * 86_400 - 1), dateTo: todayEnd }
}

export function filterDashboardAnalytics(
  analytics: DashboardAnalytics,
  currencyCode: string | null,
): DashboardAnalytics {
  if (currencyCode === null) return analytics
  return {
    breakdowns: {
      ...analytics.breakdowns,
      expensesByAccount: byCurrency(
        analytics.breakdowns.expensesByAccount,
        currencyCode,
      ),
      expensesByCategory: byCurrency(
        analytics.breakdowns.expensesByCategory,
        currencyCode,
      ),
      expensesByCurrency: byCurrency(
        analytics.breakdowns.expensesByCurrency,
        currencyCode,
      ),
      fixedVariableExpenses: byCurrency(
        analytics.breakdowns.fixedVariableExpenses,
        currencyCode,
      ),
      incomeByCategory: byCurrency(
        analytics.breakdowns.incomeByCategory,
        currencyCode,
      ),
      largestTransactions: byCurrency(
        analytics.breakdowns.largestTransactions,
        currencyCode,
      ),
      recurringExpenses: byCurrency(
        analytics.breakdowns.recurringExpenses,
        currencyCode,
      ),
      spendingByWeekday: byCurrency(
        analytics.breakdowns.spendingByWeekday,
        currencyCode,
      ),
      topMerchants: byCurrency(analytics.breakdowns.topMerchants, currencyCode),
    },
    overview: {
      ...analytics.overview,
      averageExpensePerDay: byCurrency(
        analytics.overview.averageExpensePerDay,
        currencyCode,
      ),
      comparison: byCurrency(analytics.overview.comparison, currencyCode),
      compensation: byCurrency(analytics.overview.compensation, currencyCode),
      excludedTotals: byCurrency(
        analytics.overview.excludedTotals,
        currencyCode,
      ),
      projectedMonthExpenses: byCurrency(
        analytics.overview.projectedMonthExpenses,
        currencyCode,
      ),
      totals: byCurrency(analytics.overview.totals, currencyCode),
    },
    trends: {
      ...analytics.trends,
      daily: byCurrency(analytics.trends.daily, currencyCode),
      monthly: byCurrency(analytics.trends.monthly, currencyCode),
      spendingTrend: byCurrency(analytics.trends.spendingTrend, currencyCode),
    },
  }
}

export function availableCurrencies(analytics: DashboardAnalytics): string[] {
  return [
    ...new Set([
      ...analytics.overview.totals.map((item) => item.currencyCode),
      ...analytics.breakdowns.expensesByCurrency.map(
        (item) => item.currencyCode,
      ),
    ]),
  ].sort()
}

export function totalForCurrency(
  totals: CurrencyTotals[],
  currencyCode: string,
): CurrencyTotals | null {
  return totals.find((total) => total.currencyCode === currencyCode) ?? null
}

export function chartSeries(
  points: TimeSeriesPoint[],
  value: keyof Pick<
    CurrencyTotals,
    'expenseAmountMinor' | 'incomeAmountMinor' | 'netAmountMinor'
  >,
): Array<{ periodStart: number; value: number }> {
  return points.map((point) => ({
    periodStart: point.periodStart,
    value: point[value],
  }))
}

export function chartAccentIndex(stableKey: string): number {
  let hash = 2_166_136_261
  for (let index = 0; index < stableKey.length; index += 1) {
    hash ^= stableKey.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0) % 5
}

export function formatCurrencyAmount(
  amountMinor: number,
  currencyCode: string,
  minorUnit = 2,
): string {
  return new Intl.NumberFormat(undefined, {
    currency: currencyCode,
    currencyDisplay: 'code',
    maximumFractionDigits: minorUnit,
    minimumFractionDigits: minorUnit,
    style: 'currency',
  }).format(amountMinor / 10 ** minorUnit)
}

export function formatPeriod(
  timestamp: number,
  granularity: 'day' | 'month',
): string {
  return new Intl.DateTimeFormat(undefined, {
    day: granularity === 'day' ? 'numeric' : undefined,
    month: granularity === 'day' ? 'short' : 'short',
    year: granularity === 'day' ? undefined : 'numeric',
  }).format(timestamp * 1_000)
}

function byCurrency<T extends { currencyCode: string }>(
  items: T[] | undefined,
  currencyCode: string,
): T[] {
  return (items ?? []).filter((item) => item.currencyCode === currencyCode)
}

function dateInputToEpoch(value: string): number | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.getTime() / 1_000
}

function localEpoch(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime() / 1_000
}
