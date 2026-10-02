import { expect, test, type Page } from '@playwright/test'
import { installFinanceApiMock } from './fixtures/finance-api'
import type { TransactionListItem } from '../../src/features/transactions/transaction-types'

test.use({ hasTouch: true })

function syntheticTransaction(
  index: number,
  overrides: Partial<TransactionListItem> = {},
): TransactionListItem {
  return {
    id: `synthetic-${index}`,
    originalDescription: `Merchant ${index}`,
    originalAmountMinor: -4000,
    effectiveAmountMinor: -4000,
    originalTimestamp: 1736942400 - index * 60,
    originalMcc: 5812,
    currencyCode: 'UAH',
    currencyMinorUnit: 2,
    account: { id: 'account-1', type: 'black', maskedPan: '537541******1234' },
    category: { id: 'mcc-5812', name: 'Food', source: 'original' },
    originalCategory: { id: 'mcc-5812', name: 'Food' },
    adjustmentNote: null,
    exclusionReason: null,
    hasAdjustment: false,
    hasCompensation: false,
    isExcluded: false,
    ...overrides,
  }
}

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
}

test('cursor overlap is deduplicated, a later failure retains rows and retry preserves scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  const rows = Array.from({ length: 24 }, (_, index) =>
    syntheticTransaction(index),
  )
  let failNextPage = true
  await page.route('**/api/transactions?*', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    if (cursor && failNextPage)
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'unavailable', message: 'Synthetic page failure' },
        },
      })
    await route.fulfill({
      json: {
        data: cursor
          ? {
              nextCursor: null,
              transactions: [rows[23], syntheticTransaction(24)],
            }
          : { nextCursor: 'page-two', transactions: rows },
      },
    })
  })
  await login(page)
  await page.goto('/transactions')
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(24)
  await expect(page.locator('.transactions-shown-total')).toContainText(
    'Shown transactions total',
  )
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Shown transactions are preserved.',
  )
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(24)
  failNextPage = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(25)
  await expect(
    page.getByRole('button', { name: 'Load more', exact: true }),
  ).toHaveCount(0)
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(500)
  expect(
    await page.locator('.transactions-ledger-row').allTextContents(),
  ).toHaveLength(25)
  await page.getByRole('button', { name: /Merchant 24/ }).tap()
  await expect(
    page.getByRole('dialog', { name: 'Transaction details', exact: true }),
  ).toBeVisible()
})

test('search, direction, accounts and partial custom dates reset the cursor and show truthful filtered/empty states', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: {
        data: {
          accounts: ['black', 'white'].map((type, index) => ({
            id: `account-${index + 1}`,
            type,
            isActive: true,
            balanceMinor: 0,
            creditLimitMinor: null,
            cards: [],
            currency: {
              code: index === 0 ? 'UAH' : 'USD',
              minorUnit: 2,
              displayName: index === 0 ? 'Ukrainian Hryvnia' : 'US Dollar',
              numericCode: index === 0 ? '980' : '840',
            },
          })),
        },
      },
    }),
  )
  const requested: URL[] = []
  await page.route('**/api/transactions?*', async (route) => {
    const url = new URL(route.request().url())
    requested.push(url)
    const matching = url.searchParams.get('search') !== 'missing'
    await route.fulfill({
      json: {
        data: {
          nextCursor: matching ? 'next' : null,
          transactions: matching
            ? [syntheticTransaction(url.searchParams.has('cursor') ? 2 : 1)]
            : [],
        },
      },
    })
  })
  await login(page)
  await page.goto('/transactions')
  await page.getByRole('button', { name: 'Accounts', exact: true }).click()
  await page
    .getByRole('checkbox', { name: 'white · USD · account-2', exact: true })
    .uncheck()
  await expect
    .poll(() => requested.at(-1)?.searchParams.getAll('accountId'))
    .toEqual(['account-1'])
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Accounts', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Accounts', exact: true }),
  ).toContainText('1 accounts selected')
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(2)
  await page.getByRole('button', { name: 'Income', exact: true }).click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(1)
  expect(requested.at(-1)?.searchParams.get('direction')).toBe('income')
  expect(requested.at(-1)?.searchParams.has('cursor')).toBe(false)
  await page
    .getByRole('combobox', { name: 'Date range', exact: true })
    .selectOption('custom')
  await page.getByRole('button', { name: 'Filters', exact: true }).tap()
  await expect(
    page.getByRole('dialog', { name: 'Filters', exact: true }),
  ).toBeVisible()
  await page.getByLabel('From', { exact: true }).fill('2025-01-10')
  await expect
    .poll(() => requested.at(-1)?.searchParams.has('dateFrom'))
    .toBe(true)
  expect(requested.at(-1)?.searchParams.has('dateTo')).toBe(false)
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Filters', exact: true }),
  ).toBeFocused()
  await page.getByLabel('Search merchant or description').fill('missing')
  await expect(
    page.getByRole('heading', {
      name: 'No matching transactions',
      exact: true,
    }),
  ).toBeVisible()
  await expect(page.locator('.transactions-shown-total')).toHaveCount(0)
  await page.screenshot({
    path: 'phase3.local/states/filtered-empty.png',
    animations: 'disabled',
  })
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(1)
  await expect(
    page.getByRole('combobox', { name: 'Date range', exact: true }),
  ).toHaveValue('30d')
  await expect(
    page.getByRole('button', { name: 'All', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Search merchant or description')).toHaveValue(
    '',
  )
  await expect(
    page.getByRole('button', { name: 'Accounts', exact: true }),
  ).toContainText('All accounts (2)')
})

test('failed saves retain drafts; restore, category reset and unlink keep originals and related screens current', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await login(page)
  const refreshed: string[] = []
  page.on('request', (request) => {
    if (request.method() === 'GET')
      refreshed.push(new URL(request.url()).pathname)
  })
  await page.locator('.recent-transaction-row').first().click()
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  await page.route('**/api/transactions/expense-1/adjustment', (route) =>
    route.fulfill({
      status: 409,
      json: { error: { code: 'conflict', message: 'Synthetic save failure' } },
    }),
  )
  await page.getByLabel('Effective amount (UAH)').fill('-10.00')
  await page.getByLabel('Note').fill('Retained draft')
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('could not be saved')
  await expect(page.getByLabel('Note')).toHaveValue('Retained draft')
  await page.unroute('**/api/transactions/expense-1/adjustment')
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(page.locator('.transaction-details-amount')).toContainText(
    '10.00',
  )
  await expect
    .poll(
      () =>
        refreshed.filter((path) => path.startsWith('/api/analytics/')).length,
    )
    .toBeGreaterThanOrEqual(3)
  await expect
    .poll(() => refreshed.filter((path) => path === '/api/transactions').length)
    .toBeGreaterThan(0)
  expect(refreshed).not.toContain('/api/accounts')
  await page
    .getByRole('button', { name: 'Reset adjustment', exact: true })
    .click()
  await expect(page.getByLabel('Effective amount (UAH)')).toHaveValue('-40.00')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('button', { name: 'Analytics category', exact: true })
    .click()
  await page.getByLabel('Custom category').selectOption('category-dining')
  await page.getByRole('button', { name: 'Save category', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Reset to original', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Reset to original', exact: true })
    .click()
  await expect(page.getByLabel('Custom category')).toHaveValue('')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Compensations', exact: true }).click()
  await page
    .getByLabel('Suggested incoming transaction')
    .selectOption('income-1')
  await page
    .getByRole('button', { name: 'Link compensation', exact: true })
    .click()
  await expect(page.locator('.compensation-link')).toHaveCount(1)
  await page.getByRole('button', { name: 'Unlink', exact: true }).click()
  await expect(page.locator('.compensation-link')).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page
    .getByRole('button', { name: 'Analytics exclusion', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Exclude from analytics', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Restore to analytics', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Exclude from analytics', exact: true }),
  ).toBeVisible()
  await page.getByText('Original bank information', { exact: true }).click()
  await expect(page.locator('.transaction-original-information')).toContainText(
    '40.00',
  )
  await expect(page.locator('.transaction-original-information')).toContainText(
    '5812',
  )
  await page.keyboard.press('Escape')
  await expect(page.locator('.recent-transaction-row')).toContainText('40.00')
})

test('cached ledger remains readable offline and mobile touch targets/foregrounds are accessible in both themes', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: {
        data: {
          accounts: [
            {
              id: 'synthetic-account-identifier-with-a-long-unbroken-suffix-01234567890123456789',
              type: 'black',
              isActive: true,
              balanceMinor: 0,
              creditLimitMinor: null,
              cards: [],
              currency: {
                code: 'UAH',
                minorUnit: 2,
                displayName: 'Ukrainian Hryvnia',
                numericCode: '980',
              },
            },
          ],
        },
      },
    }),
  )
  await login(page)
  await page.goto('/transactions')
  await expect(page.locator('.transactions-ledger-row')).toBeVisible()
  await page.getByRole('button', { name: 'Accounts', exact: true }).click()
  expect(
    await page
      .locator('.ui-multi-select__menu')
      .evaluate((menu) => menu.scrollWidth <= menu.clientWidth),
  ).toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.keyboard.press('Escape')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => (document.documentElement.dataset['theme'] = theme),
      theme,
    )
    const targets = await page
      .locator('.transactions-page :is(button, select, input[type=search])')
      .evaluateAll((elements) =>
        elements
          .filter((element) => element.getBoundingClientRect().width > 0)
          .map((element) => ({
            name: element.textContent,
            width: (element.matches('input[type=search]')
              ? element.closest('label')!
              : element
            ).getBoundingClientRect().width,
            height: (element.matches('input[type=search]')
              ? element.closest('label')!
              : element
            ).getBoundingClientRect().height,
          })),
      )
    for (const target of targets) {
      expect(target.width, target.name ?? '').toBeGreaterThanOrEqual(44)
      expect(target.height, target.name ?? '').toBeGreaterThanOrEqual(44)
    }
    const colors = await page
      .locator('.transactions-ledger-row')
      .first()
      .evaluate((row) => {
        const texts = row.querySelectorAll(
          '.transactions-ledger-row__transaction strong, .transactions-ledger-row__category, .transactions-ledger-row__account, .transactions-ledger-row__amount',
        )
        return [...texts].map((text) => ({
          color: getComputedStyle(text).color,
          background: getComputedStyle(row.closest('ul')!).backgroundColor,
        }))
      })
    const luminance = (css: string) => {
      const channels = css
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map((value) => Number(value) / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        )
      return (
        channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
      )
    }
    for (const color of colors) {
      const front = luminance(color.color)
      const back = luminance(color.background)
      expect(
        (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05),
      ).toBeGreaterThanOrEqual(4.5)
    }
  }
  await context.setOffline(true)
  await expect(page.locator('.offline-status')).toContainText('Offline')
  await expect(page.locator('.transactions-ledger-row')).toContainText(
    'Restaurant',
  )
  await page.screenshot({
    path: 'phase3.local/states/offline.png',
    animations: 'disabled',
  })
  await context.setOffline(false)
})

test('details preserve originals, cancellation discards drafts, validation prevents unsafe amounts, and pending saves submit once', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await login(page)
  await page.goto('/transactions')
  const row = page.getByRole('button', { name: /Restaurant/ })
  await row.focus()
  await page.keyboard.press('Enter')
  await page.getByText('Original bank information', { exact: true }).click()
  await expect(page.locator('.transaction-original-information')).toContainText(
    '5812',
  )
  await expect(page.locator('.transaction-original-information')).toContainText(
    '537541******1234',
  )
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  const amount = page.getByLabel('Effective amount (UAH)')
  await expect(amount).toBeFocused()
  await amount.fill('10.00')
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'must keep the transaction direction',
  )
  await amount.fill('-10.001')
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'at most 2 decimal places',
  )
  await amount.fill('-12.00')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Analytics adjustment', exact: true }),
  ).toBeFocused()
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  await expect(amount).toHaveValue('-40.00')
  let requests = 0
  let finishSave: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    finishSave = resolve
  })
  await page.route(
    '**/api/transactions/expense-1/adjustment',
    async (route) => {
      requests++
      expect(route.request().postDataJSON()).toEqual({
        adjustedAmountMinor: -1000,
        note: null,
      })
      await pending
      await route.fulfill({
        json: {
          data: {
            correction: {
              id: 'expense-1',
              effectiveAmountMinor: -1000,
              hasAdjustment: true,
              isExcluded: false,
            },
          },
        },
      })
    },
  )
  await amount.fill('-10.00')
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Saving…', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeDisabled()
  expect(requests).toBe(1)
  finishSave!()
  await expect(
    page.getByRole('status').filter({ hasText: 'Changes saved.' }),
  ).toBeVisible()
  await expect(page.locator('.transaction-original-information')).toContainText(
    '40.00',
  )
  await expect(page.locator('.transaction-details-amount')).toContainText(
    '10.00',
  )
  await page.keyboard.press('Escape')
  await expect(row).toBeFocused()
})

test('mobile compensation validates availability, blocks repeated submission and refreshes related queries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await login(page)
  await page.goto('/transactions')
  await page.getByRole('button', { name: /Restaurant/ }).tap()
  await page.getByRole('button', { name: 'Compensations', exact: true }).click()
  await page
    .getByLabel('Suggested incoming transaction')
    .selectOption('income-1')
  const amount = page.getByLabel('Compensated amount (UAH)')
  await amount.fill('10.01')
  await page
    .getByRole('button', { name: 'Link compensation', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'exceeds the available income',
  )
  await amount.fill('10.00')
  await page
    .getByRole('button', { name: 'Link compensation', exact: true })
    .click()
  await expect(page.locator('.compensation-link')).toContainText(
    'Ivan reimbursement',
  )
  await expect(page.getByLabel('Suggested incoming transaction')).toHaveValue(
    '',
  )
  await expect(
    page.getByRole('button', { name: 'Link compensation', exact: true }),
  ).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.locator('.transactions-ledger-row')).toContainText(
    'Compensated',
  )
})

test('initial loading and recoverable errors are distinct from an empty period', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await login(page)
  let mode: 'loading' | 'error' | 'empty' = 'loading'
  let finishLoading: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    finishLoading = resolve
  })
  await page.route('**/api/transactions?*', async (route) => {
    if (mode === 'loading') await pending
    await route.fulfill(
      mode === 'error'
        ? {
            status: 503,
            json: {
              error: { code: 'unavailable', message: 'Synthetic failure' },
            },
          }
        : { json: { data: { nextCursor: null, transactions: [] } } },
    )
  })
  await page.goto('/transactions')
  await expect(page.locator('.ui-skeleton')).toBeVisible()
  await page.screenshot({
    path: 'phase3.local/states/loading.png',
    animations: 'disabled',
  })
  await expect(
    page.getByRole('heading', {
      name: 'No transactions in this period.',
      exact: true,
    }),
  ).toHaveCount(0)
  mode = 'error'
  finishLoading!()
  await expect(page.getByRole('alert')).toContainText(
    'Transactions could not be loaded',
  )
  await page.screenshot({
    path: 'phase3.local/states/error.png',
    animations: 'disabled',
  })
  mode = 'empty'
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'No transactions in this period.',
      exact: true,
    }),
  ).toBeVisible()
  await page.screenshot({
    path: 'phase3.local/states/empty-period.png',
    animations: 'disabled',
  })
})

test('ledger and full-height details wrap long synthetic content at every breakpoint in both themes and languages', async ({
  page,
}) => {
  test.setTimeout(180000)
  await installFinanceApiMock(page)
  await page.clock.install({ time: new Date('2025-01-15T12:00:00Z') })
  const rows = [
    syntheticTransaction(0),
    syntheticTransaction(1, {
      effectiveAmountMinor: 101,
      originalAmountMinor: 101,
      originalDescription: 'Income counterparty',
      currencyCode: 'KWD',
      currencyMinorUnit: 3,
    }),
    syntheticTransaction(2, {
      effectiveAmountMinor: 0,
      originalAmountMinor: 0,
      originalDescription: 'Unknown merchant',
      category: { id: null, name: null, source: null },
      currencyCode: 'JPY',
      currencyMinorUnit: 0,
    }),
    syntheticTransaction(3, {
      originalTimestamp: 1736856000,
      originalDescription:
        'Synthetic imported bank description with a very long merchant and counterparty name — Повний незмінений банківський опис для перевірки перенесення тексту',
      effectiveAmountMinor: -Number.MAX_SAFE_INTEGER,
      originalAmountMinor: -Number.MAX_SAFE_INTEGER,
      account: {
        id: 'account-2',
        type: 'Long synthetic account identity',
        maskedPan: '537541******9876',
      },
      category: {
        id: 'custom',
        name: 'Long synthetic category name for wrapping',
        source: 'custom',
      },
    }),
  ]
  await page.route('**/api/transactions?*', (route) =>
    route.fulfill({ json: { data: { nextCursor: null, transactions: rows } } }),
  )
  await login(page)
  for (const theme of ['light', 'dark']) {
    for (const locale of ['en', 'uk']) {
      await page.evaluate(
        ({ theme, locale }) => {
          localStorage.setItem('mono-finance-theme-v1', theme)
          localStorage.setItem('mono-finance-locale-v1', locale)
        },
        { theme, locale },
      )
      for (const width of [320, 375, 390, 430, 768, 1200, 1440]) {
        await page.setViewportSize({ width, height: 932 })
        await page.goto('/transactions')
        await expect(page.locator('.transactions-ledger-row')).toHaveCount(4)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        // The mixed-currency date has no combined amount. The older, single-currency group is explicitly labeled.
        await expect(page.locator('.transactions-shown-total')).toHaveCount(1)
        if (locale === 'en' && (width === 390 || width === 1440))
          await page.screenshot({
            path: `phase3.local/screenshots/transactions-${width}-${theme}.png`,
            fullPage: true,
            animations: 'disabled',
          })
        if (width !== 320 && width !== 390 && width !== 1440) continue
        const textScaleStyle = await page.addStyleTag({
          content: 'html { font-size: 200%; }',
        })
        const overflow = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('body *')]
            .filter((element) => {
              const rect = element.getBoundingClientRect()
              return rect.width > 0 && rect.right > innerWidth + 1
            })
            .map((element) => ({
              tag: element.tagName,
              class: element.className,
              width: element.clientWidth,
              scroll: element.scrollWidth,
            })),
        )
        expect(overflow).toEqual([])
        await page.locator('.transactions-ledger-row').last().click()
        await expect(page.locator('.transaction-details-overlay')).toBeVisible()
        expect(
          await page
            .locator('.ui-overlay__surface')
            .evaluate((surface) => surface.scrollWidth <= surface.clientWidth),
        ).toBe(true)
        await page.screenshot({
          path: `phase3.local/states/details-large-${width}-${theme}-${locale}.png`,
          animations: 'disabled',
        })
        await page.keyboard.press('Escape')
        await textScaleStyle.evaluate((style) => style.remove())
        expect(
          await page
            .locator('html')
            .evaluate((root) => getComputedStyle(root).fontSize),
        ).toBe('16px')
        if (locale === 'en' && (width === 390 || width === 1440)) {
          await page.locator('.transactions-ledger-row').first().click()
          await page.screenshot({
            path: `phase3.local/screenshots/details-${width}-${theme}.png`,
            animations: 'disabled',
          })
          await page
            .getByRole('button', { name: 'Analytics adjustment', exact: true })
            .click()
          await page.setViewportSize({ width, height: 430 })
          const save = page.getByRole('button', {
            name: 'Save adjustment',
            exact: true,
          })
          await save.scrollIntoViewIfNeeded()
          const bounds = await save.boundingBox()
          expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(430)
          await page.setViewportSize({ width, height: 932 })
          await page.keyboard.press('Escape')
        }
      }
    }
  }
})
