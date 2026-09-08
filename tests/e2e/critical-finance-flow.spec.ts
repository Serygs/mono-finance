import { expect, test, type Page } from '@playwright/test'

test('an owner can complete the critical private-finance workflow', async ({
  page,
}) => {
  await installFinanceApiMock(page)

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your money, in clear focus.' }),
  ).toBeVisible()

  const periodRequest = page.waitForRequest((request) =>
    request.url().includes('/api/analytics/overview'),
  )
  const periodSelect = page.locator('.dashboard-filters').getByLabel('Period')
  await periodSelect.selectOption('7d')
  await periodRequest
  await expect(periodSelect).toHaveValue('7d')

  const accountRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/analytics/overview') &&
      new URL(request.url()).searchParams.get('accountId') === 'account-1',
  )
  await page.getByRole('button', { name: 'Black account' }).click()
  await accountRequest

  await page.getByRole('link', { name: 'Transactions' }).first().click()
  await expect(page.getByRole('button', { name: /Restaurant/ })).toBeVisible()
  await page.getByRole('button', { name: /Restaurant/ }).click()
  await expect(page.getByRole('heading', { name: 'Restaurant' })).toBeVisible()

  await page.getByLabel('Effective amount (UAH)').fill('-10.00')
  await page.getByLabel('Note').fill('Shared dinner')
  await page.getByRole('button', { name: 'Save adjustment' }).click()
  await expect(page.getByText('Original:')).toBeVisible()

  await page.getByLabel('Reason').fill('Reimbursed')
  await page.getByRole('button', { name: 'Exclude from analytics' }).click()
  await expect(
    page.getByRole('button', { name: 'Restore to analytics' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Restore to analytics' }).click()

  await page.getByLabel('Custom category').selectOption('category-dining')
  await page.getByRole('button', { name: 'Save category' }).click()
  await expect(
    page.getByRole('button', { name: /Restaurant/ }).getByText('Dining'),
  ).toBeVisible()

  await page
    .getByLabel('Suggested incoming transaction')
    .selectOption('income-1')
  await page.getByRole('button', { name: 'Link compensation' }).click()
  await expect(page.locator('.compensation-link')).toContainText(
    'Ivan reimbursement',
  )

  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByRole('link', { name: 'Overview' }).first().click()
  await expect(page.getByText('Recent adjusted transactions')).toBeVisible()
  await expect(page.getByText('Recent compensations')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your finances, kept private.' }),
  ).toBeVisible()
})

async function installFinanceApiMock(page: Page): Promise<void> {
  const sessionExpiry = Math.floor(Date.now() / 1_000) + 8 * 60 * 60
  const state = {
    adjusted: false,
    category: 'Food',
    compensated: false,
    excluded: false,
    signedIn: false,
  }
  const transaction = () => ({
    account: { id: 'account-1', maskedPan: '537541******1234', type: 'black' },
    adjustmentNote: state.adjusted ? 'Shared dinner' : null,
    category: {
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
      await route.fulfill(
        json(
          state.signedIn
            ? { data: { expiresAt: sessionExpiry, user: owner } }
            : unauthorized,
        ),
      )
      return
    }
    if (path === '/api/auth/login' && method === 'POST') {
      state.signedIn = true
      await route.fulfill(
        json({ data: { expiresAt: sessionExpiry, user: owner } }),
      )
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
      return void route.fulfill(json({ data: trends }))
    if (path === '/api/categories' && method === 'GET')
      return void route.fulfill(json({ data: { categories } }))
    if (path === '/api/transactions' && method === 'GET')
      return void route.fulfill(
        json({ data: { nextCursor: null, transactions: [transaction()] } }),
      )
    if (path === '/api/transactions/expense-1/adjustment' && method === 'PUT') {
      state.adjusted = true
      await route.fulfill(json({ data: { correction: correction(state) } }))
      return
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
      path === '/api/transactions/expense-1/compensations' &&
      method === 'GET'
    ) {
      await route.fulfill(json({ data: compensationDetails(state) }))
      return
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
const overview = {
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
const breakdowns = {
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
  incomeByCategory: [],
  largestTransactions: [],
  topMerchants: [
    {
      amountMinor: 4_000,
      currencyCode: 'UAH',
      description: 'Restaurant',
      transactionCount: 1,
    },
  ],
}
const trends = {
  currencyConversion,
  daily: [
    {
      currencyCode: 'UAH',
      expenseAmountMinor: 4_000,
      incomeAmountMinor: 1_000,
      netAmountMinor: -3_000,
      periodStart: 1_735_689_600,
    },
  ],
  monthly: [],
  spendingTrend: [],
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
