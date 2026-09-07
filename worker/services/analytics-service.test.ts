import { describe, expect, it } from 'vitest'

import {
  AnalyticsService,
  type AnalyticsRepository,
  type ResolvedAnalyticsTransaction,
} from './analytics-service'

describe('AnalyticsService', () => {
  it('uses effective values, omits exclusions, resolves overrides, and separates compensation', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository([
        item({
          id: 'groceries',
          amount: -4_000,
          category: 'Groceries',
          timestamp: 1_704_067_200,
        }),
        item({
          id: 'dinner',
          amount: -1_000,
          category: 'Shared meals',
          timestamp: 1_704_067_300,
          compensated: 3_000,
          originalAmount: -4_000,
        }),
        item({
          id: 'salary',
          amount: 10_000,
          category: null,
          direction: 'income',
          timestamp: 1_704_067_400,
        }),
        item({
          id: 'ignored',
          amount: -9_000,
          category: 'Travel',
          excluded: true,
          timestamp: 1_704_067_500,
        }),
        item({
          id: 'usd',
          amount: -500,
          category: 'Travel',
          currency: 'USD',
          accountId: 'account-2',
          timestamp: 1_704_067_600,
        }),
      ]),
    )

    const overview = await service.overview(filters())
    const breakdowns = await service.breakdowns(filters())

    expect(overview.totals).toEqual([
      {
        currencyCode: 'UAH',
        expenseAmountMinor: 5_000,
        incomeAmountMinor: 10_000,
        netAmountMinor: 5_000,
      },
      {
        currencyCode: 'USD',
        expenseAmountMinor: 500,
        incomeAmountMinor: 0,
        netAmountMinor: -500,
      },
    ])
    expect(overview.compensation).toEqual([
      {
        amountMinor: 5_000,
        compensatedExpenseAmountMinor: 1_000,
        currencyCode: 'UAH',
        personalExpenseAmountMinor: 4_000,
      },
      {
        amountMinor: 500,
        compensatedExpenseAmountMinor: 0,
        currencyCode: 'USD',
        personalExpenseAmountMinor: 500,
      },
    ])
    expect(overview.excludedTotals).toEqual([
      { currencyCode: 'UAH', expenseAmountMinor: 9_000, incomeAmountMinor: 0 },
    ])
    expect(breakdowns.expensesByCategory).toContainEqual({
      categoryId: 'category-1',
      categoryName: 'Shared meals',
      currencyCode: 'UAH',
      amountMinor: 1_000,
    })
    expect(breakdowns.expensesByAccount).toContainEqual({
      accountId: 'account-2',
      amountMinor: 500,
      currencyCode: 'USD',
    })
  })

  it('compares the selected period with the preceding comparable period and projects the month', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository([
        item({ id: 'current', amount: -3_000, timestamp: 1_704_844_800 }),
        item({ id: 'previous', amount: -2_000, timestamp: 1_704_412_800 }),
      ]),
      () => 1_705_190_400,
    )

    const overview = await service.overview({
      ...filters(),
      dateFrom: 1_704_758_400,
      dateTo: 1_705_103_999,
    })

    expect(overview.comparison).toEqual([
      {
        currencyCode: 'UAH',
        currentExpenseAmountMinor: 3_000,
        previousExpenseAmountMinor: 2_000,
        changeAmountMinor: 1_000,
      },
    ])
    expect(overview.projectedMonthExpenses).toEqual([
      { currencyCode: 'UAH', amountMinor: 11_071 },
    ])
  })
})

function filters() {
  return {
    accountIds: [],
    dateFrom: 1_704_067_200,
    dateTo: 1_705_103_999,
    userId: 'owner-1',
  }
}
function item(
  input: Partial<ResolvedAnalyticsTransaction> & {
    amount: number
    category?: string | null
    compensated?: number
    currency?: string
    excluded?: boolean
    id: string
    originalAmount?: number
    timestamp: number
  },
): ResolvedAnalyticsTransaction {
  const amount = input.amount
  return {
    accountId: input.accountId ?? 'account-1',
    categoryId: input.category === null ? null : 'category-1',
    categoryName: input.category ?? 'Food',
    compensationAmountMinor: input.compensated ?? 0,
    currencyCode: input.currency ?? input.currencyCode ?? 'UAH',
    direction: input.direction ?? (amount < 0 ? 'expense' : 'income'),
    effectiveAmountMinor: amount,
    id: input.id,
    isExcluded: input.excluded ?? false,
    originalAmountMinor: input.originalAmount ?? amount,
    originalDescription: input.originalDescription ?? 'Market',
    originalTimestamp: input.timestamp,
  }
}
class FakeAnalyticsRepository implements AnalyticsRepository {
  private readonly transactions: ResolvedAnalyticsTransaction[]
  constructor(transactions: ResolvedAnalyticsTransaction[]) {
    this.transactions = transactions
  }
  async listResolvedTransactions(filters: {
    accountIds: string[]
    dateFrom: number
    dateTo: number
  }) {
    return this.transactions.filter(
      (transaction) =>
        transaction.originalTimestamp >= filters.dateFrom &&
        transaction.originalTimestamp <= filters.dateTo &&
        (filters.accountIds.length === 0 ||
          filters.accountIds.includes(transaction.accountId)),
    )
  }
}
