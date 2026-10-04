import { describe, expect, it } from 'vitest'

import {
  AnalyticsService,
  type AnalyticsRepository,
  type ResolvedAnalyticsTransaction,
} from './analytics-service'

describe('AnalyticsService', () => {
  it.each([
    {
      name: 'occasional repeated purchases',
      days: [0, 180],
      amounts: [5000, 7000],
      average: 6000,
      interval: 180,
    },
    {
      name: 'periodic payments',
      days: [0, 30, 60],
      amounts: [12000, 12000, 12000],
      average: 12000,
      interval: 30,
    },
    {
      name: 'variable payment amounts',
      days: [0, 30, 60],
      amounts: [10000, 14000, 12000],
      average: 12000,
      interval: 30,
    },
  ])(
    'preserves observed repeat-purchase evidence for $name without validating an obligation',
    async ({ name, days, amounts, average, interval }) => {
      const start = 1_704_067_200
      const service = new AnalyticsService(
        new FakeAnalyticsRepository(
          days.map((day, index) =>
            item({
              id: `purchase-${index}`,
              amount: -amounts[index]!,
              originalDescription: name,
              timestamp: start + day * 86400,
            }),
          ),
        ),
      )
      const dateFrom = start + days.at(-1)! * 86400
      const breakdowns = await service.breakdowns({
        ...filters(),
        dateFrom,
        dateTo: dateFrom + 86399,
      })
      expect(breakdowns.recurringExpenses).toEqual([
        {
          averageAmountMinor: average,
          currencyCode: 'UAH',
          description: name,
          frequencyDays: interval,
          lastAmountMinor: amounts.at(-1),
          transactionCount: days.length,
        },
      ])
    },
  )

  it('returns positive largest-transaction magnitudes together with explicit expense and income direction', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository([
        item({ id: 'expense', amount: -4000, timestamp: 1_704_067_200 }),
        item({ id: 'income', amount: 2000, timestamp: 1_704_067_201 }),
      ]),
    )
    const breakdowns = await service.breakdowns(filters())
    expect(breakdowns.largestTransactions).toMatchObject([
      { amountMinor: 4000, direction: 'expense', transactionId: 'expense' },
      { amountMinor: 2000, direction: 'income', transactionId: 'income' },
    ])
    expect(breakdowns.topMerchants[0]?.amountMinor).toBe(4000)
  })

  it.each([
    {
      compensated: 5_000,
      currency: 'USD',
      expense: 400_000,
      compensation: 200_000,
      personal: 200_000,
    },
    {
      compensated: 10_000,
      currency: 'USD',
      expense: 400_000,
      compensation: 400_000,
      personal: 0,
    },
    {
      compensated: 15_000,
      currency: 'USD',
      expense: 400_000,
      compensation: 400_000,
      personal: 0,
    },
    {
      compensated: 5_000,
      currency: 'UAH',
      expense: 10_000,
      compensation: 5_000,
      personal: 5_000,
    },
  ])(
    'reports compensation in base currency for $currency / $compensated',
    async ({ compensated, currency, expense, compensation, personal }) => {
      const service = new AnalyticsService(
        new FakeAnalyticsRepository(
          [
            item({
              id: 'expense',
              amount: -10_000,
              compensated,
              currency,
              timestamp: 1_704_067_200,
            }),
          ],
          [
            {
              rateAt: 1_704_000_000,
              rateDenominator: 1,
              rateNumerator: 40,
              source: 'test',
              sourceCurrencyCode: 'USD',
              targetCurrencyCode: 'UAH',
            },
          ],
        ),
      )
      const overview = await service.overview({
        ...filters(),
        baseCurrencyCode: 'UAH',
      })
      expect(overview.compensation).toEqual([
        {
          amountMinor: expense,
          compensatedExpenseAmountMinor: compensation,
          currencyCode: 'UAH',
          personalExpenseAmountMinor: personal,
        },
      ])
    },
  )

  it('derives rounded personal expense from the converted expense and compensation', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository(
        [
          item({
            id: 'expense',
            amount: -3,
            compensated: 1,
            currency: 'USD',
            timestamp: 1_704_067_200,
          }),
        ],
        [
          {
            rateAt: 1_704_000_000,
            rateDenominator: 2,
            rateNumerator: 1,
            source: 'test',
            sourceCurrencyCode: 'USD',
            targetCurrencyCode: 'UAH',
          },
        ],
      ),
    )
    const overview = await service.overview({
      ...filters(),
      baseCurrencyCode: 'UAH',
    })
    expect(overview.compensation).toEqual([
      {
        amountMinor: 2,
        compensatedExpenseAmountMinor: 1,
        currencyCode: 'UAH',
        personalExpenseAmountMinor: 1,
      },
    ])
  })

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

  it('returns base-currency analytics only for transactions with a stored historical rate', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository(
        [
          item({ id: 'uah', amount: -1_000, timestamp: 1_704_067_200 }),
          item({
            id: 'usd',
            amount: -1_000,
            currency: 'USD',
            timestamp: 1_704_067_200,
          }),
          item({
            id: 'eur-missing',
            amount: -1_000,
            currency: 'EUR',
            timestamp: 1_704_067_200,
          }),
        ],
        [
          {
            rateAt: 1_704_000_000,
            rateDenominator: 100,
            rateNumerator: 4_000,
            source: 'test',
            sourceCurrencyCode: 'USD',
            targetCurrencyCode: 'UAH',
          },
        ],
      ),
    )

    const overview = await service.overview({
      ...filters(),
      baseCurrencyCode: 'UAH',
    })

    expect(overview.totals).toEqual([
      {
        currencyCode: 'UAH',
        expenseAmountMinor: 41_000,
        incomeAmountMinor: 0,
        netAmountMinor: -41_000,
      },
    ])
    expect(overview.currencyConversion).toEqual({
      baseCurrencyCode: 'UAH',
      missingRateTransactionCounts: [{ count: 1, currencyCode: 'EUR' }],
      mode: 'base',
    })
  })

  it('returns weekday and merchant aggregates with legacy repeat-purchase evidence fields', async () => {
    const service = new AnalyticsService(
      new FakeAnalyticsRepository([
        item({
          id: 'rent-january',
          amount: -12_000,
          originalDescription: 'Rent',
          timestamp: 1_704_067_200,
        }),
        item({
          id: 'rent-february',
          amount: -12_000,
          originalDescription: 'Rent',
          timestamp: 1_706_659_200,
        }),
        item({
          id: 'groceries',
          amount: -2_500,
          originalDescription: 'Market',
          timestamp: 1_706_745_600,
        }),
      ]),
    )

    const breakdowns = await service.breakdowns({
      ...filters(),
      dateFrom: 1_706_659_200,
      dateTo: 1_706_800_000,
    })

    expect(breakdowns.spendingByWeekday).toContainEqual({
      amountMinor: 2_500,
      currencyCode: 'UAH',
      transactionCount: 1,
      weekday: 4,
    })
    expect(breakdowns.topMerchants[0]).toEqual({
      amountMinor: 12_000,
      currencyCode: 'UAH',
      description: 'Rent',
      transactionCount: 1,
    })
    expect(breakdowns.recurringExpenses).toEqual([
      {
        averageAmountMinor: 12_000,
        currencyCode: 'UAH',
        description: 'Rent',
        frequencyDays: 30,
        lastAmountMinor: 12_000,
        transactionCount: 2,
      },
    ])
    expect(breakdowns.fixedVariableExpenses).toEqual([
      {
        currencyCode: 'UAH',
        fixedExpenseAmountMinor: 12_000,
        variableExpenseAmountMinor: 2_500,
      },
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
  private readonly rates
  constructor(
    transactions: ResolvedAnalyticsTransaction[],
    rates: Array<{
      rateAt: number
      rateDenominator: number
      rateNumerator: number
      source: string
      sourceCurrencyCode: string
      targetCurrencyCode: string
    }> = [],
  ) {
    this.transactions = transactions
    this.rates = rates
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
  async listExchangeRates() {
    return this.rates
  }
}
