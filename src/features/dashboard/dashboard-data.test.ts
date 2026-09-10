import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DASHBOARD_DATE_PRESET,
  availableCurrencies,
  chartAccentIndex,
  displayExpenseCategories,
  filterDashboardAnalytics,
  resolveDashboardRange,
  type DashboardAnalytics,
} from './dashboard-data'

describe('dashboard data', () => {
  it('starts with a range wide enough to include the first historical backfill windows', () => {
    expect(DEFAULT_DASHBOARD_DATE_PRESET).toBe('90d')
  })

  it('keeps currency groups separate when a display currency is selected', () => {
    const filtered = filterDashboardAnalytics(analytics(), 'UAH')

    expect(filtered.overview.totals).toEqual([
      {
        currencyCode: 'UAH',
        expenseAmountMinor: 4_000,
        incomeAmountMinor: 8_000,
        netAmountMinor: 4_000,
      },
    ])
    expect(filtered.trends.daily).toHaveLength(1)
    expect(filtered.breakdowns.expensesByCategory).toEqual([
      {
        amountMinor: 4_000,
        categoryId: 'food',
        categoryName: 'Food',
        currencyCode: 'UAH',
      },
    ])
  })

  it('provides stable display currencies without silently converting money', () => {
    expect(availableCurrencies(analytics())).toEqual(['UAH', 'USD'])
  })

  it('resolves a custom date range through the end of the selected final day', () => {
    const range = resolveDashboardRange('custom', '2024-01-01', '2024-01-31')

    expect(range?.dateTo).toBe((range?.dateFrom ?? 0) + 30 * 86_400 + 86_399)
  })

  it('keeps a category accent stable when the chart order changes', () => {
    const originalOrder = ['Food', 'Travel', 'Home'].map((category) =>
      chartAccentIndex(category),
    )
    const reordered = ['Home', 'Food', 'Travel'].map((category) =>
      chartAccentIndex(category),
    )

    expect(reordered).toEqual([
      originalOrder[2],
      originalOrder[0],
      originalOrder[1],
    ])
    expect(originalOrder.every((index) => index >= 0 && index < 5)).toBe(true)
  })

  it('shows the five largest expense categories and groups the remainder', () => {
    const categories = [300, 900, 800, 700, 600, 500, 400].map(
      (amountMinor, index) => ({
        amountMinor,
        categoryId: `category-${index + 1}`,
        categoryName: `Category ${index + 1}`,
        currencyCode: 'UAH',
      }),
    )

    const rankedCategories = [
      categories[1],
      categories[2],
      categories[3],
      categories[4],
      categories[5],
      categories[6],
      categories[0],
    ]

    expect(displayExpenseCategories(categories, 'Other')).toEqual({
      all: rankedCategories,
      initial: [
        ...rankedCategories.slice(0, 5),
        {
          amountMinor: 700,
          categoryId: null,
          categoryName: 'Other',
          currencyCode: 'UAH',
        },
      ],
    })
  })
})

function analytics(): DashboardAnalytics {
  return {
    breakdowns: {
      currencyConversion: {
        baseCurrencyCode: null,
        missingRateTransactionCounts: [],
        mode: 'original',
      },
      expensesByAccount: [],
      expensesByCategory: [
        {
          amountMinor: 4_000,
          categoryId: 'food',
          categoryName: 'Food',
          currencyCode: 'UAH',
        },
        {
          amountMinor: 500,
          categoryId: 'travel',
          categoryName: 'Travel',
          currencyCode: 'USD',
        },
      ],
      expensesByCurrency: [
        { amountMinor: 4_000, currencyCode: 'UAH' },
        { amountMinor: 500, currencyCode: 'USD' },
      ],
      incomeByCategory: [],
      largestTransactions: [],
      topMerchants: [],
    },
    overview: {
      currencyConversion: {
        baseCurrencyCode: null,
        missingRateTransactionCounts: [],
        mode: 'original',
      },
      averageExpensePerDay: [],
      comparison: [],
      compensation: [],
      excludedTotals: [],
      projectedMonthExpenses: [],
      totals: [
        {
          currencyCode: 'UAH',
          expenseAmountMinor: 4_000,
          incomeAmountMinor: 8_000,
          netAmountMinor: 4_000,
        },
        {
          currencyCode: 'USD',
          expenseAmountMinor: 500,
          incomeAmountMinor: 0,
          netAmountMinor: -500,
        },
      ],
    },
    trends: {
      currencyConversion: {
        baseCurrencyCode: null,
        missingRateTransactionCounts: [],
        mode: 'original',
      },
      daily: [
        {
          currencyCode: 'UAH',
          expenseAmountMinor: 4_000,
          incomeAmountMinor: 8_000,
          netAmountMinor: 4_000,
          periodStart: 1_704_067_200,
        },
        {
          currencyCode: 'USD',
          expenseAmountMinor: 500,
          incomeAmountMinor: 0,
          netAmountMinor: -500,
          periodStart: 1_704_067_200,
        },
      ],
      monthly: [],
      spendingTrend: [],
    },
  }
}
