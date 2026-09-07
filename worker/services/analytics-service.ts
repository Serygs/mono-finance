import {
  convertTransactionsToBaseCurrency,
  type HistoricalExchangeRate,
  type MissingCurrencyRate,
} from '../analytics/currency-conversion'

export interface AnalyticsFilters {
  accountIds: string[]
  baseCurrencyCode?: string
  dateFrom: number
  dateTo: number
  userId: string
}

export interface ResolvedAnalyticsTransaction {
  accountId: string
  categoryId: string | null
  categoryName: string | null
  compensationAmountMinor: number
  currencyCode: string
  direction: 'expense' | 'income'
  effectiveAmountMinor: number
  id: string
  isExcluded: boolean
  originalAmountMinor: number
  originalDescription: string
  originalTimestamp: number
}

export interface AnalyticsRepository {
  listExchangeRates(input: {
    currencyCodes: string[]
    dateTo: number
  }): Promise<HistoricalExchangeRate[]>
  listResolvedTransactions(
    filters: AnalyticsFilters,
  ): Promise<ResolvedAnalyticsTransaction[]>
}

export interface CurrencyTotals {
  currencyCode: string
  expenseAmountMinor: number
  incomeAmountMinor: number
  netAmountMinor: number
}

export interface AnalyticsOverview {
  averageExpensePerDay: CurrencyAmount[]
  comparison: PeriodComparison[]
  compensation: CompensationTotals[]
  excludedTotals: ExcludedTotals[]
  projectedMonthExpenses: CurrencyAmount[]
  totals: CurrencyTotals[]
  currencyConversion: CurrencyConversion
}

export interface AnalyticsBreakdowns {
  expensesByAccount: AccountAmount[]
  expensesByCategory: CategoryAmount[]
  expensesByCurrency: CurrencyAmount[]
  incomeByCategory: CategoryAmount[]
  largestTransactions: LargestTransaction[]
  topMerchants: MerchantAmount[]
  currencyConversion: CurrencyConversion
}

export interface AnalyticsTrends {
  daily: TimeSeriesPoint[]
  monthly: TimeSeriesPoint[]
  spendingTrend: TimeSeriesPoint[]
  currencyConversion: CurrencyConversion
}

export interface CurrencyConversion {
  baseCurrencyCode: string | null
  missingRateTransactionCounts: MissingCurrencyRate[]
  mode: 'base' | 'original'
}

export interface CurrencyAmount {
  amountMinor: number
  currencyCode: string
}
export interface AccountAmount extends CurrencyAmount {
  accountId: string
}
export interface CategoryAmount extends CurrencyAmount {
  categoryId: string | null
  categoryName: string
}
export interface MerchantAmount extends CurrencyAmount {
  description: string
  transactionCount: number
}
export interface LargestTransaction extends CurrencyAmount {
  description: string
  direction: 'expense' | 'income'
  timestamp: number
  transactionId: string
}
export interface TimeSeriesPoint extends CurrencyTotals {
  periodStart: number
}
export interface PeriodComparison {
  changeAmountMinor: number
  currencyCode: string
  currentExpenseAmountMinor: number
  previousExpenseAmountMinor: number
}
export interface CompensationTotals extends CurrencyAmount {
  compensatedExpenseAmountMinor: number
  personalExpenseAmountMinor: number
}
export interface ExcludedTotals {
  currencyCode: string
  expenseAmountMinor: number
  incomeAmountMinor: number
}

export class AnalyticsService {
  private readonly repository: AnalyticsRepository
  private readonly now: () => number

  constructor(
    repository: AnalyticsRepository,
    now: () => number = () => Math.floor(Date.now() / 1_000),
  ) {
    this.repository = repository
    this.now = now
  }

  async overview(filters: AnalyticsFilters): Promise<AnalyticsOverview> {
    const currentTimestamp = this.now()
    const [transactions, previousTransactions, monthTransactions] =
      await Promise.all([
        this.repository.listResolvedTransactions(filters),
        this.repository.listResolvedTransactions(previousPeriod(filters)),
        this.repository.listResolvedTransactions({
          ...filters,
          dateFrom: monthStart(currentTimestamp),
          dateTo: currentTimestamp,
        }),
      ])
    const converted = await this.convertGroups(filters.baseCurrencyCode, [
      transactions,
      previousTransactions,
      monthTransactions,
    ])
    const [
      currentTransactions,
      previousTransactionsConverted,
      monthTransactionsConverted,
    ] = converted.groups
    const [currentConversion] = converted.conversions
    const included = (currentTransactions ?? []).filter(
      (transaction) => !transaction.isExcluded,
    )
    const previousIncluded = (previousTransactionsConverted ?? []).filter(
      (transaction) => !transaction.isExcluded,
    )
    const monthIncluded = (monthTransactionsConverted ?? []).filter(
      (transaction) => !transaction.isExcluded,
    )
    return {
      averageExpensePerDay: averageExpenses(included, filters),
      comparison: compareExpenses(included, previousIncluded),
      compensation: compensationTotals(included),
      excludedTotals: excludedTotals(currentTransactions ?? []),
      projectedMonthExpenses: projectMonthExpenses(
        monthIncluded,
        currentTimestamp,
      ),
      totals: totals(included),
      currencyConversion: currentConversion ?? originalCurrencyConversion(),
    }
  }

  async breakdowns(filters: AnalyticsFilters): Promise<AnalyticsBreakdowns> {
    const transactions = await this.repository.listResolvedTransactions(filters)
    const converted = await this.convertGroups(filters.baseCurrencyCode, [
      transactions,
    ])
    const [currentTransactions] = converted.groups
    const [currentConversion] = converted.conversions
    const included = (currentTransactions ?? []).filter(
      (transaction) => !transaction.isExcluded,
    )
    const expenses = included.filter(
      (transaction) => transaction.direction === 'expense',
    )
    return {
      expensesByAccount: groupAmounts(
        expenses,
        (transaction) => transaction.accountId,
      ).map(([key, currencyCode, amountMinor]) => ({
        accountId: key,
        amountMinor,
        currencyCode,
      })),
      expensesByCategory: categoryAmounts(expenses),
      expensesByCurrency: currencyAmounts(expenses),
      incomeByCategory: categoryAmounts(
        included.filter((transaction) => transaction.direction === 'income'),
      ),
      largestTransactions: [...included]
        .sort(
          (left, right) =>
            Math.abs(right.effectiveAmountMinor) -
              Math.abs(left.effectiveAmountMinor) ||
            right.originalTimestamp - left.originalTimestamp ||
            left.id.localeCompare(right.id),
        )
        .slice(0, 10)
        .map((transaction) => ({
          amountMinor: Math.abs(transaction.effectiveAmountMinor),
          currencyCode: transaction.currencyCode,
          description: transaction.originalDescription,
          direction: transaction.direction,
          timestamp: transaction.originalTimestamp,
          transactionId: transaction.id,
        })),
      topMerchants: merchantAmounts(expenses),
      currencyConversion: currentConversion ?? originalCurrencyConversion(),
    }
  }

  async trends(filters: AnalyticsFilters): Promise<AnalyticsTrends> {
    const transactions = await this.repository.listResolvedTransactions(filters)
    const converted = await this.convertGroups(filters.baseCurrencyCode, [
      transactions,
    ])
    const [currentTransactions] = converted.groups
    const [currentConversion] = converted.conversions
    const included = (currentTransactions ?? []).filter(
      (transaction) => !transaction.isExcluded,
    )
    return {
      daily: timeSeries(included, dayStart),
      monthly: timeSeries(included, monthStart),
      spendingTrend: timeSeries(
        included.filter((transaction) => transaction.direction === 'expense'),
        monthStart,
      ),
      currencyConversion: currentConversion ?? originalCurrencyConversion(),
    }
  }

  private async convertGroups(
    baseCurrencyCode: string | undefined,
    groups: ResolvedAnalyticsTransaction[][],
  ): Promise<{
    conversions: CurrencyConversion[]
    groups: ResolvedAnalyticsTransaction[][]
  }> {
    if (baseCurrencyCode === undefined) {
      return {
        conversions: groups.map(() => originalCurrencyConversion()),
        groups,
      }
    }
    const transactions = groups.flat()
    const rates = await this.repository.listExchangeRates({
      currencyCodes: [
        ...new Set(
          transactions
            .map((transaction) => transaction.currencyCode)
            .concat(baseCurrencyCode),
        ),
      ],
      dateTo: Math.max(
        ...transactions.map((transaction) => transaction.originalTimestamp),
        0,
      ),
    })
    const converted = groups.map((group) =>
      convertTransactionsToBaseCurrency(group, baseCurrencyCode, rates),
    )
    return {
      conversions: converted.map((item) => ({
        baseCurrencyCode,
        missingRateTransactionCounts: item.missing,
        mode: 'base' as const,
      })),
      groups: converted.map((item) => item.converted),
    }
  }
}

function originalCurrencyConversion(): CurrencyConversion {
  return {
    baseCurrencyCode: null,
    missingRateTransactionCounts: [],
    mode: 'original',
  }
}

function totals(
  transactions: ResolvedAnalyticsTransaction[],
): CurrencyTotals[] {
  const values = new Map<string, CurrencyTotals>()
  for (const transaction of transactions) {
    const current = values.get(transaction.currencyCode) ?? {
      currencyCode: transaction.currencyCode,
      expenseAmountMinor: 0,
      incomeAmountMinor: 0,
      netAmountMinor: 0,
    }
    if (transaction.direction === 'expense')
      current.expenseAmountMinor += -transaction.effectiveAmountMinor
    else current.incomeAmountMinor += transaction.effectiveAmountMinor
    current.netAmountMinor += transaction.effectiveAmountMinor
    values.set(transaction.currencyCode, current)
  }
  return [...values.values()].sort(byCurrency)
}
function excludedTotals(
  transactions: ResolvedAnalyticsTransaction[],
): ExcludedTotals[] {
  return totals(
    transactions.filter((transaction) => transaction.isExcluded),
  ).map(({ currencyCode, expenseAmountMinor, incomeAmountMinor }) => ({
    currencyCode,
    expenseAmountMinor,
    incomeAmountMinor,
  }))
}
function compensationTotals(
  transactions: ResolvedAnalyticsTransaction[],
): CompensationTotals[] {
  const values = new Map<string, CompensationTotals>()
  for (const transaction of transactions.filter(
    (item) => item.direction === 'expense',
  )) {
    const current = values.get(transaction.currencyCode) ?? {
      amountMinor: 0,
      compensatedExpenseAmountMinor: 0,
      currencyCode: transaction.currencyCode,
      personalExpenseAmountMinor: 0,
    }
    const expense = -transaction.effectiveAmountMinor
    const compensated = Math.min(expense, transaction.compensationAmountMinor)
    current.amountMinor += expense
    current.compensatedExpenseAmountMinor += compensated
    current.personalExpenseAmountMinor += expense - compensated
    values.set(transaction.currencyCode, current)
  }
  return [...values.values()].sort(byCurrency)
}
function compareExpenses(
  current: ResolvedAnalyticsTransaction[],
  previous: ResolvedAnalyticsTransaction[],
): PeriodComparison[] {
  const currentTotals = totals(current)
  const previousTotals = totals(previous)
  const currencies = new Set([
    ...currentTotals.map((item) => item.currencyCode),
    ...previousTotals.map((item) => item.currencyCode),
  ])
  return [...currencies].sort().map((currencyCode) => {
    const currentExpenseAmountMinor =
      currentTotals.find((item) => item.currencyCode === currencyCode)
        ?.expenseAmountMinor ?? 0
    const previousExpenseAmountMinor =
      previousTotals.find((item) => item.currencyCode === currencyCode)
        ?.expenseAmountMinor ?? 0
    return {
      changeAmountMinor: currentExpenseAmountMinor - previousExpenseAmountMinor,
      currencyCode,
      currentExpenseAmountMinor,
      previousExpenseAmountMinor,
    }
  })
}
function averageExpenses(
  transactions: ResolvedAnalyticsTransaction[],
  filters: AnalyticsFilters,
): CurrencyAmount[] {
  const days = Math.floor((filters.dateTo - filters.dateFrom) / 86_400) + 1
  return currencyAmounts(
    transactions.filter((item) => item.direction === 'expense'),
  ).map((item) => ({
    ...item,
    amountMinor: Math.round(item.amountMinor / days),
  }))
}
function projectMonthExpenses(
  transactions: ResolvedAnalyticsTransaction[],
  now: number,
): CurrencyAmount[] {
  const elapsedDays = Math.floor((now - monthStart(now)) / 86_400) + 1
  const daysInMonth = Math.floor(
    (nextMonthStart(now) - monthStart(now)) / 86_400,
  )
  return currencyAmounts(
    transactions.filter((item) => item.direction === 'expense'),
  ).map((item) => ({
    ...item,
    amountMinor: Math.round((item.amountMinor * daysInMonth) / elapsedDays),
  }))
}
function categoryAmounts(
  transactions: ResolvedAnalyticsTransaction[],
): CategoryAmount[] {
  return groupAmounts(
    transactions,
    (item) =>
      `${item.categoryId ?? ''}\u0000${item.categoryName ?? 'Uncategorized'}`,
  ).map(([key, currencyCode, amountMinor]) => {
    const [categoryId, categoryName = 'Uncategorized'] = key.split('\u0000')
    return {
      amountMinor,
      categoryId: categoryId || null,
      categoryName,
      currencyCode,
    }
  })
}
function currencyAmounts(
  transactions: ResolvedAnalyticsTransaction[],
): CurrencyAmount[] {
  return groupAmounts(transactions, () => '').map(
    ([, currencyCode, amountMinor]) => ({ amountMinor, currencyCode }),
  )
}
function merchantAmounts(
  transactions: ResolvedAnalyticsTransaction[],
): MerchantAmount[] {
  const values = new Map<string, MerchantAmount>()
  for (const transaction of transactions) {
    const key = `${transaction.currencyCode}\u0000${transaction.originalDescription}`
    const current = values.get(key) ?? {
      amountMinor: 0,
      currencyCode: transaction.currencyCode,
      description: transaction.originalDescription,
      transactionCount: 0,
    }
    current.amountMinor += -transaction.effectiveAmountMinor
    current.transactionCount += 1
    values.set(key, current)
  }
  return [...values.values()]
    .sort(
      (left, right) =>
        right.amountMinor - left.amountMinor ||
        right.transactionCount - left.transactionCount ||
        left.description.localeCompare(right.description),
    )
    .slice(0, 10)
}
function groupAmounts(
  transactions: ResolvedAnalyticsTransaction[],
  key: (transaction: ResolvedAnalyticsTransaction) => string,
): [string, string, number][] {
  const values = new Map<
    string,
    { amountMinor: number; currencyCode: string; key: string }
  >()
  for (const transaction of transactions) {
    const groupKey = `${key(transaction)}\u0001${transaction.currencyCode}`
    const current = values.get(groupKey) ?? {
      amountMinor: 0,
      currencyCode: transaction.currencyCode,
      key: key(transaction),
    }
    current.amountMinor += Math.abs(transaction.effectiveAmountMinor)
    values.set(groupKey, current)
  }
  return [...values.values()]
    .map(
      ({ amountMinor, currencyCode, key: keyPart }) =>
        [keyPart, currencyCode, amountMinor] as [string, string, number],
    )
    .sort(
      (left, right) =>
        right[2] - left[2] ||
        left[0].localeCompare(right[0]) ||
        left[1].localeCompare(right[1]),
    )
}
function timeSeries(
  transactions: ResolvedAnalyticsTransaction[],
  start: (timestamp: number) => number,
): TimeSeriesPoint[] {
  const values = new Map<string, TimeSeriesPoint>()
  for (const transaction of transactions) {
    const periodStart = start(transaction.originalTimestamp)
    const key = `${periodStart}\u0000${transaction.currencyCode}`
    const current = values.get(key) ?? {
      currencyCode: transaction.currencyCode,
      expenseAmountMinor: 0,
      incomeAmountMinor: 0,
      netAmountMinor: 0,
      periodStart,
    }
    if (transaction.direction === 'expense')
      current.expenseAmountMinor += -transaction.effectiveAmountMinor
    else current.incomeAmountMinor += transaction.effectiveAmountMinor
    current.netAmountMinor += transaction.effectiveAmountMinor
    values.set(key, current)
  }
  return [...values.values()].sort(
    (left, right) =>
      left.periodStart - right.periodStart ||
      left.currencyCode.localeCompare(right.currencyCode),
  )
}
function previousPeriod(filters: AnalyticsFilters): AnalyticsFilters {
  const length = filters.dateTo - filters.dateFrom + 1
  return {
    ...filters,
    dateFrom: filters.dateFrom - length,
    dateTo: filters.dateFrom - 1,
  }
}
function dayStart(timestamp: number): number {
  return Math.floor(timestamp / 86_400) * 86_400
}
function monthStart(timestamp: number): number {
  const date = new Date(timestamp * 1_000)
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1) / 1_000,
  )
}
function nextMonthStart(timestamp: number): number {
  const date = new Date(timestamp * 1_000)
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) / 1_000,
  )
}
function byCurrency(
  left: { currencyCode: string },
  right: { currencyCode: string },
): number {
  return left.currencyCode.localeCompare(right.currencyCode)
}
