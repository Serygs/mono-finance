import type { Page } from '@playwright/test'
import type { TransactionListItem } from '../../../src/features/transactions/transaction-types'

export async function installFinanceApiMock(
  page: Page,
  {
    trendsOverride,
    transactionCategory,
  }: {
    trendsOverride?: typeof trends
    transactionCategory?: TransactionListItem['category']
  } = {},
): Promise<void> {
  const state = {
    adjusted: false,
    category: 'Food',
    compensated: false,
    excluded: false,
    signedIn: false,
    sourceCategoryId: '',
  }
  const transaction = () => ({
    account: { id: 'account-1', maskedPan: '537541******1234', type: 'black' },
    adjustmentNote: state.adjusted ? 'Shared dinner' : null,
    category: transactionCategory ?? {
      id: state.category === 'Dining' ? 'category-dining' : 'mcc-5812',
      name: state.category,
      source: state.category === 'Dining' ? 'custom' : 'original',
    },
    currencyCode: 'UAH',
    currencyMinorUnit: 2,
    effectiveAmountMinor: state.adjusted ? -1_000 : -4_000,
    exclusionReason: state.excluded ? 'Reimbursed' : null,
    hasAdjustment: state.adjusted,
    hasCompensation: state.compensated,
    id: 'expense-1',
    isExcluded: state.excluded,
    originalAmountMinor: -4_000,
    originalCategory: { id: 'mcc-5812', name: 'Food' },
    originalDescription: 'Restaurant',
    originalMcc: 5812,
    originalTimestamp: 1_735_689_600,
  })
  const json = (data: unknown) => ({
    contentType: 'application/json',
    body: JSON.stringify(data),
  })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    if (path === '/api/auth/session') {
      await route.fulfill({
        ...json(state.signedIn ? { data: authenticatedSession } : unauthorized),
        status: state.signedIn ? 200 : 401,
      })
      return
    }
    if (path === '/api/auth/login' && method === 'POST') {
      state.signedIn = true
      await route.fulfill(json({ data: authenticatedSession }))
      return
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      state.signedIn = false
      await route.fulfill(json({ data: {} }))
      return
    }
    if (path === '/api/accounts')
      return void route.fulfill(json({ data: { accounts } }))
    if (path === '/api/preferences/currency')
      return void route.fulfill(json({ data: { baseCurrencyCode: 'UAH' } }))
    if (path === '/api/sync/transactions/status')
      return void route.fulfill(json({ data: { syncStates: [] } }))
    if (path === '/api/analytics/overview')
      return void route.fulfill(json({ data: overview }))
    if (path === '/api/analytics/breakdowns')
      return void route.fulfill(json({ data: breakdowns }))
    if (path === '/api/analytics/trends')
      return void route.fulfill(json({ data: trendsOverride ?? trends }))
    if (path === '/api/categories' && method === 'GET')
      return void route.fulfill(json({ data: { categories } }))
    if (path === '/api/category-sources' && method === 'GET')
      return void route.fulfill(
        json({
          data: {
            page: 1,
            pageSize: 10,
            sources: [
              {
                code: 'mcc-5812',
                originalName: 'Food',
                transactionCount: 1,
                mappedCategory:
                  state.sourceCategoryId === '' ? null : categories[0],
              },
            ],
            totalItems: 1,
          },
        }),
      )
    if (path === '/api/category-sources/mcc-5812' && method === 'PUT') {
      state.sourceCategoryId = 'category-dining'
      return void route.fulfill(
        json({
          data: {
            source: {
              code: 'mcc-5812',
              originalName: 'Food',
              transactionCount: 1,
              mappedCategory: categories[0],
            },
          },
        }),
      )
    }
    if (path === '/api/transactions' && method === 'GET')
      return void route.fulfill(
        json({ data: { nextCursor: null, transactions: [transaction()] } }),
      )
    if (path === '/api/transactions/expense-1/adjustment' && method === 'PUT') {
      state.adjusted = true
      await route.fulfill(json({ data: { correction: correction(state) } }))
      return
    }
    if (
      path === '/api/transactions/expense-1/adjustment' &&
      method === 'DELETE'
    ) {
      state.adjusted = false
      return void route.fulfill(
        json({ data: { correction: correction(state) } }),
      )
    }
    if (path === '/api/transactions/expense-1/exclusion' && method === 'PUT') {
      state.excluded = true
      await route.fulfill(json({ data: { correction: correction(state) } }))
      return
    }
    if (
      path === '/api/transactions/expense-1/exclusion' &&
      method === 'DELETE'
    ) {
      state.excluded = false
      await route.fulfill(json({ data: { correction: correction(state) } }))
      return
    }
    if (path === '/api/transactions/expense-1/category' && method === 'PUT') {
      state.category = 'Dining'
      await route.fulfill(
        json({
          data: {
            category: {
              id: 'category-dining',
              name: 'Dining',
              source: 'custom',
            },
            originalCategory: { id: 'mcc-5812', name: 'Food' },
          },
        }),
      )
      return
    }
    if (
      path === '/api/transactions/expense-1/category' &&
      method === 'DELETE'
    ) {
      state.category = 'Food'
      return void route.fulfill(
        json({
          data: {
            category: { id: 'mcc-5812', name: 'Food', source: 'original' },
            originalCategory: { id: 'mcc-5812', name: 'Food' },
          },
        }),
      )
    }
    if (
      path === '/api/transactions/expense-1/compensations' &&
      method === 'GET'
    ) {
      await route.fulfill(json({ data: compensationDetails(state) }))
      return
    }
    if (
      path === '/api/transactions/expense-1/compensations/link-1' &&
      method === 'DELETE'
    ) {
      state.compensated = false
      return void route.fulfill(json({ data: compensationDetails(state) }))
    }
    if (
      path === '/api/transactions/expense-1/compensations' &&
      method === 'POST'
    ) {
      state.compensated = true
      await route.fulfill(json({ data: compensationDetails(state) }))
      return
    }
    await route.fulfill(
      json({
        error: {
          code: 'not_found',
          message: 'Mock endpoint is not configured.',
        },
      }),
    )
  })
}

const owner = { email: 'owner@example.com', id: 'owner-1' }
const authenticatedSession = { expiresAt: 4_102_444_800, user: owner }
const unauthorized = {
  error: { code: 'unauthenticated', message: 'Authentication is required.' },
}
const accounts = [
  {
    balanceMinor: 125_000,
    cards: [{ id: 'card-1', isActive: true, maskedPan: '537541******1234' }],
    creditLimitMinor: null,
    currency: {
      code: 'UAH',
      displayName: 'Ukrainian Hryvnia',
      minorUnit: 2,
      numericCode: '980',
    },
    id: 'account-1',
    isActive: true,
    type: 'black',
  },
]
const currencyConversion = {
  baseCurrencyCode: null,
  missingRateTransactionCounts: [],
  mode: 'original' as const,
}
export const overview = {
  averageExpensePerDay: [{ amountMinor: 1_000, currencyCode: 'UAH' }],
  comparison: [],
  compensation: [
    {
      amountMinor: 4_000,
      compensatedExpenseAmountMinor: 0,
      currencyCode: 'UAH',
      personalExpenseAmountMinor: 4_000,
    },
  ],
  currencyConversion,
  excludedTotals: [],
  projectedMonthExpenses: [{ amountMinor: 30_000, currencyCode: 'UAH' }],
  totals: [
    {
      currencyCode: 'UAH',
      expenseAmountMinor: 4_000,
      incomeAmountMinor: 1_000,
      netAmountMinor: -3_000,
    },
  ],
}
export const breakdowns = {
  currencyConversion,
  expensesByAccount: [
    { accountId: 'account-1', amountMinor: 4_000, currencyCode: 'UAH' },
  ],
  expensesByCategory: [
    {
      amountMinor: 4_000,
      categoryId: 'mcc-5812',
      categoryName: 'Food',
      currencyCode: 'UAH',
    },
  ],
  expensesByCurrency: [{ amountMinor: 4_000, currencyCode: 'UAH' }],
  fixedVariableExpenses: [],
  incomeByCategory: [],
  largestTransactions: [],
  recurringExpenses: [],
  spendingByWeekday: [
    {
      amountMinor: -1_000,
      currencyCode: 'UAH',
      transactionCount: 1,
      weekday: 1,
    },
    {
      amountMinor: -2_500,
      currencyCode: 'UAH',
      transactionCount: 2,
      weekday: 3,
    },
    {
      amountMinor: -1_800,
      currencyCode: 'UAH',
      transactionCount: 1,
      weekday: 6,
    },
  ],
  topMerchants: [
    {
      amountMinor: 4_000,
      currencyCode: 'UAH',
      description: 'Restaurant',
      transactionCount: 1,
    },
  ],
}
export const trends = {
  currencyConversion,
  daily: Array.from({ length: 7 }, (_, index) => ({
    currencyCode: 'UAH',
    expenseAmountMinor: 1_800 + index * 350,
    incomeAmountMinor: index % 2 === 0 ? 3_000 + index * 300 : 800,
    netAmountMinor:
      (index % 2 === 0 ? 3_000 + index * 300 : 800) - (1_800 + index * 350),
    periodStart: 1_735_689_600 + index * 86_400,
  })),
  monthly: [
    {
      currencyCode: 'UAH',
      expenseAmountMinor: 2_800,
      incomeAmountMinor: 4_200,
      netAmountMinor: 1_400,
      periodStart: 1_733_011_200,
    },
    {
      currencyCode: 'UAH',
      expenseAmountMinor: 4_000,
      incomeAmountMinor: 1_000,
      netAmountMinor: -3_000,
      periodStart: 1_735_689_600,
    },
  ],
  spendingTrend: Array.from({ length: 7 }, (_, index) => ({
    currencyCode: 'UAH',
    expenseAmountMinor: 1_500 + (index % 3) * 900 + index * 200,
    incomeAmountMinor: 0,
    netAmountMinor: -(1_500 + (index % 3) * 900 + index * 200),
    periodStart: 1_735_689_600 + index * 86_400,
  })),
}
export const highVarianceTrends = {
  ...trends,
  daily: Array.from({ length: 7 }, (_, index) => ({
    currencyCode: 'UAH',
    expenseAmountMinor: index === 3 ? -200_000 : index === 1 ? -700 : 0,
    incomeAmountMinor: index === 0 ? 500 : index === 3 ? 100_000 : 0,
    netAmountMinor:
      index === 3 ? -100_000 : index === 1 ? -700 : index === 0 ? 500 : 0,
    periodStart: 1_735_689_600 + index * 86_400,
  })),
}
const categories = [
  { colorToken: 'orange', icon: 'fork', id: 'category-dining', name: 'Dining' },
]

function correction(state: { adjusted: boolean; excluded: boolean }) {
  return {
    effectiveAmountMinor: state.adjusted ? -1_000 : -4_000,
    hasAdjustment: state.adjusted,
    id: 'expense-1',
    isExcluded: state.excluded,
  }
}
function compensationDetails(state: { compensated: boolean }) {
  return {
    links: state.compensated
      ? [
          {
            compensatedAmountMinor: 1_000,
            compensationTransactionId: 'income-1',
            description: 'Ivan reimbursement',
            id: 'link-1',
            originalTimestamp: 1_735_690_000,
          },
        ]
      : [],
    suggestions: [
      {
        availableAmountMinor: 1_000,
        confidenceScore: 95,
        description: 'Ivan reimbursement',
        originalTimestamp: 1_735_690_000,
        transactionId: 'income-1',
      },
    ],
    summary: {
      compensatedAmountMinor: state.compensated ? 1_000 : 0,
      currencyCode: 'UAH',
      originalExpenseAmountMinor: -4_000,
      remainingPersonalExpenseMinor: state.compensated ? -3_000 : -4_000,
    },
  }
}
