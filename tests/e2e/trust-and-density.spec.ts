import { expect, test, type Page } from '@playwright/test'
import {
  installFinanceApiMock,
  breakdowns,
  overview,
} from './fixtures/finance-api'
import type { TransactionListItem } from '../../src/features/transactions/transaction-types'

test.use({ hasTouch: true })
const artifact = 'phase-trust.local/screenshots'
const accountId = '00000000-0000-4000-8000-000000000001'
const amounts = [3890, 2000, 1000, 900, 800, 700, 400, 310, 0]
const transactions: TransactionListItem[] = amounts.map((amount, index) => ({
  account: { id: accountId, type: '', maskedPan: null },
  adjustmentNote: null,
  category: {
    id: index === 0 ? '5411' : `source-${index}`,
    name:
      index === 0
        ? 'Synthetic bank category with a long unabridged name'
        : `Synthetic category ${index}`,
    source: 'original',
  },
  originalCategory: {
    id: index === 0 ? '5411' : `source-${index}`,
    name: 'Original synthetic category',
  },
  currencyCode: 'UAH',
  currencyMinorUnit: 2,
  effectiveAmountMinor: -amount,
  exclusionReason: null,
  hasAdjustment: index === 0,
  hasCompensation: index === 0,
  id: `synthetic-${index}`,
  isExcluded: false,
  originalAmountMinor: -amount,
  originalDescription:
    index === 0
      ? 'Synthetic merchant with a deliberately long name for wrapping'
      : `Synthetic merchant ${index}`,
  originalMcc: index === 0 ? 5411 : null,
  originalTimestamp: 1737800000 - index,
}))
async function fixture(page: Page) {
  await page.clock.setFixedTime(new Date('2025-01-30T12:00:00Z'))
  await installFinanceApiMock(page)
  const requests: URL[] = []
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: {
        data: {
          accounts: [
            {
              id: accountId,
              type: '',
              balanceMinor: 10000,
              creditLimitMinor: null,
              cards: [],
              currency: {
                code: 'UAH',
                minorUnit: 2,
                numericCode: '980',
                displayName: 'UAH',
              },
              isActive: true,
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/analytics/breakdowns?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...breakdowns,
          expensesByCategory: transactions.map((item) => ({
            categoryId: item.category.id,
            categoryName: item.category.name,
            currencyCode: item.currencyCode,
            amountMinor: -item.effectiveAmountMinor,
          })),
        },
      },
    }),
  )
  await page.route('**/api/analytics/overview?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...overview,
          totals: [
            {
              currencyCode: 'UAH',
              expenseAmountMinor: 10000,
              incomeAmountMinor: 0,
              netAmountMinor: -10000,
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/transactions?*', (route) => {
    const url = new URL(route.request().url())
    requests.push(url)
    let items = transactions.filter((item) => {
      const categoryId = url.searchParams.get('categoryId'),
        category = url.searchParams.get('category')
      return (
        (categoryId === null || item.category.id === categoryId) &&
        (category === null || item.category.name === category) &&
        url.searchParams.get('direction') !== 'income' &&
        (url.searchParams.get('currency') === null ||
          url.searchParams.get('currency') === item.currencyCode)
      )
    })
    const cursor = url.searchParams.get('cursor')
    if (cursor) items = items.slice(2)
    const paginate = url.searchParams.get('limit') !== '100'
    return route.fulfill({
      json: {
        data: {
          transactions: paginate ? items.slice(0, 2) : items,
          nextCursor:
            paginate && items.length > 2
              ? btoa(
                  JSON.stringify({ id: 'synthetic-1', timestamp: 1737800000 }),
                )
              : null,
        },
      },
    })
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  return requests
}
function luminance(color: string) {
  const channels = color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number)
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
}
function contrast(foreground: string, background: string) {
  const a = luminance(foreground),
    b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test('selected label remains readable through hover, focus, active and disabled in both themes', async ({
  page,
}) => {
  await fixture(page)
  await page.goto('/settings')
  for (const theme of ['light', 'dark']) {
    await page
      .getByRole('button', {
        name: theme === 'dark' ? 'Dark' : 'Light',
        exact: true,
      })
      .click()
    const selected = page.locator(
      '.settings-row--theme button[aria-pressed="true"]',
    )
    for (const state of ['default', 'hover', 'focus', 'active', 'disabled']) {
      if (state === 'default') await page.mouse.move(0, 0)
      if (state === 'hover') await selected.hover()
      if (state === 'focus') await selected.focus()
      if (state === 'active') await page.mouse.down()
      if (state === 'disabled')
        await selected.evaluate(
          (node) => ((node as HTMLButtonElement).disabled = true),
        )
      await page.waitForTimeout(180)
      const pair = await selected.evaluate((node) => ({
        foreground: getComputedStyle(node).color,
        label: getComputedStyle(node.querySelector('span')!).color,
        background: getComputedStyle(node).backgroundColor,
      }))
      expect(pair.label).toBe(pair.foreground)
      expect(
        contrast(pair.label, pair.background),
        `${theme} ${state}`,
      ).toBeGreaterThanOrEqual(4.5)
      if (state === 'active') await page.mouse.up()
      if (state === 'disabled')
        await selected.evaluate(
          (node) => ((node as HTMLButtonElement).disabled = false),
        )
    }
    await page.screenshot({ path: `${artifact}/theme-after-${theme}.png` })
  }
  // Reproduce the baseline specificity defect on synthetic data only.
  await page.getByRole('button', { name: 'Dark', exact: true }).hover()
  const oldStyle = await page.addStyleTag({
    content:
      '.ui-segmented-control button:not(:disabled):hover { color: var(--color-text); }',
  })
  await page.screenshot({ path: `${artifact}/theme-before-dark-hover.png` })
  await oldStyle.evaluate((node) => node.remove())
})

test('chips remove one additional criterion and reset preserves exact base context', async ({
  page,
}) => {
  const requests = await fixture(page)
  await page.goto(
    `/transactions?accountScope=explicit&accountId=${accountId}&period=custom&dateFrom=1735689600&dateTo=1738281599&direction=expense&search=synthetic&currency=UAH&categoryId=5411&excluded=false`,
  )
  await expect(page.locator('.ui-filter-chips li')).toHaveCount(3)
  await page
    .getByRole('button', { name: 'Remove filter: Currency: UAH', exact: true })
    .click()
  await expect(page.locator('.ui-filter-chips li')).toHaveCount(2)
  await expect
    .poll(() => requests.at(-1)?.searchParams.has('currency'))
    .toBe(false)
  expect(requests.at(-1)?.searchParams.get('categoryId')).toBe('5411')
  expect(requests.at(-1)?.searchParams.get('excluded')).toBe('false')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page
    .getByRole('button', { name: 'Reset additional filters', exact: true })
    .click()
  await expect(page.locator('.ui-filter-chips li')).toHaveCount(0)
  await expect
    .poll(() => requests.at(-1)?.searchParams.has('categoryId'))
    .toBe(false)
  const parameters = requests.at(-1)!.searchParams
  expect(parameters.getAll('accountId')).toEqual([accountId])
  expect(Object.fromEntries(parameters)).toMatchObject({
    dateFrom: '1735689600',
    dateTo: '1738281599',
    direction: 'expense',
    search: 'synthetic',
  })
  await page.keyboard.press('Escape')
  const row = page.locator('.transactions-ledger-row').first()
  await expect(row).not.toContainText(accountId)
  await expect(row).toHaveAccessibleName(
    /Synthetic bank category with a long unabridged name/,
  )
  await page.getByRole('button', { name: 'Accounts', exact: true }).click()
  await expect(
    page.getByRole('checkbox', { name: 'Account · UAH', exact: true }),
  ).toBeVisible()
})

test('category shares use the full total and drill-down preserves identity and context on back', async ({
  page,
}) => {
  const requests = await fixture(page)
  await page.setViewportSize({ width: 390, height: 600 })
  await page.goto('/settings#categories')
  const group = page.locator('.category-ranking').first()
  const ratio = await group
    .locator('.category-ranking-track')
    .first()
    .evaluate(
      (track) =>
        track.firstElementChild!.getBoundingClientRect().width /
        track.getBoundingClientRect().width,
    )
  expect(ratio).toBeCloseTo(0.389, 2)
  await expect(
    group.locator('.category-ranking-copy small').first(),
  ).toHaveText('38.9%')
  await expect(group).toContainText('Other categories')
  await group
    .getByRole('button', { name: 'View all categories', exact: true })
    .click()
  const zeroTrack = group
    .locator('li')
    .filter({ hasText: 'Synthetic category 8' })
    .locator('.category-ranking-track')
  expect(
    await zeroTrack.evaluate(
      (track) => track.firstElementChild!.getBoundingClientRect().width,
    ),
  ).toBe(0)
  await group
    .getByRole('button', { name: 'Show leading categories', exact: true })
    .click()
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('7d')
  const categoryLink = group.locator('.category-ranking-link').first()
  await categoryLink.scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => window.scrollY)
  await categoryLink.click()
  await expect(page).toHaveURL(/categoryId=5411/)
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(1)
  expect(requests.at(-1)?.searchParams.get('excluded')).toBe('false')
  await page.goBack()
  await expect(
    page.getByRole('combobox', { name: 'Period', exact: true }),
  ).toHaveValue('7d')
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scroll)
})

test('KPI direction, full-set cursor requests and theme/language changes retain financial context', async ({
  page,
}) => {
  const requests = await fixture(page)
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('90d')
  await expect(page.locator('.dashboard-kpis strong')).toHaveCount(4)
  const totals = await page.locator('.dashboard-kpis strong').allTextContents()
  await page.evaluate(() => {
    localStorage.setItem('mono-finance-theme-v1', 'dark')
    localStorage.setItem('mono-finance-locale-v1', 'uk')
  })
  await page.reload()
  await expect(page.locator('.dashboard-kpis strong')).toHaveCount(4)
  await expect(
    page.getByRole('combobox', { name: 'Період', exact: true }),
  ).toHaveValue('90d')
  expect(
    (await page.locator('.dashboard-kpis strong').allTextContents()).map(
      (text) => text.replace(/\D/g, ''),
    ),
  ).toEqual(totals.map((text) => text.replace(/\D/g, '')))
  await page.evaluate(() =>
    localStorage.setItem('mono-finance-locale-v1', 'en'),
  )
  await page.reload()
  await page
    .getByRole('link', {
      name: 'View transactions for Net cash flow · UAH',
      exact: true,
    })
    .click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(2)
  expect(requests.at(-1)?.searchParams.has('direction')).toBe(false)
  const before = requests.at(-1)!.searchParams
  await page.getByRole('button', { name: 'Load more', exact: true }).click()
  await expect(page.locator('.transactions-ledger-row')).toHaveCount(4)
  const after = requests.at(-1)!.searchParams
  expect(after.has('cursor')).toBe(true)
  for (const key of ['dateFrom', 'dateTo', 'accountId', 'currency', 'excluded'])
    expect(after.getAll(key)).toEqual(before.getAll(key))
  await page.goBack()
  await expect(
    page.getByRole('combobox', { name: 'Period', exact: true }),
  ).toHaveValue('90d')
})

test('unknown history and balance freshness stay unknown after a successful import timestamp', async ({
  page,
  context,
}) => {
  await fixture(page)
  await page.route('**/api/sync/transactions/status', (route) =>
    route.fulfill({
      json: {
        data: {
          syncStates: [
            {
              accountId,
              accountType: '',
              currencyCode: 'UAH',
              status: 'idle',
              lastErrorCode: null,
              lastSuccessfulSyncAt: 1737800000,
            },
          ],
        },
      },
    }),
  )
  await page.reload()
  await page
    .getByRole('button', { name: 'Data freshness', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Data freshness',
    exact: true,
  })
  await expect(dialog).toContainText('Transaction sync succeeded')
  await expect(dialog).toContainText('Balance update time unknown')
  await expect(dialog).toContainText('History coverage unknown')
  await expect(dialog).not.toContainText(
    'Selected period has verified import coverage',
  )
  await context.setOffline(true)
  await expect(dialog).toContainText('Offline')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Data freshness', exact: true }),
  ).toBeFocused()
})

test('layout matrix fits both themes and locales, long names and doubled text', async ({
  page,
}) => {
  test.setTimeout(180000)
  await fixture(page)
  for (const locale of ['en', 'uk'])
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        ({ locale, theme }) => {
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem('mono-finance-theme-v1', theme)
        },
        { locale, theme },
      )
      for (const path of [
        '/',
        '/transactions',
        '/settings#categories',
        '/#accounts',
        '/settings',
      ]) {
        await page.goto(path)
        await expect(page.locator('.ui-skeleton:visible')).toHaveCount(0)
        for (const width of [1440, 1200, 768, 430, 390, 375, 320]) {
          await page.setViewportSize({ width, height: 900 })
          await expect
            .poll(
              () =>
                page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              { message: `${path} ${locale} ${theme} ${width}` },
            )
            .toBe(true)
          if (locale === 'en' && [390, 1440].includes(width))
            await page.screenshot({
              path: `${artifact}/${path.includes('categories') ? 'categories' : path.includes('accounts') ? 'accounts' : path.includes('transactions') ? 'transactions' : path.includes('settings') ? 'settings' : 'overview'}-${width}-${theme}.png`,
              fullPage: true,
            })
        }
        await page.addStyleTag({ content: 'html { font-size: 200%; }' })

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${path} doubled text`,
        ).toBe(true)
      }
    }
})

test('moving and resizing desktop widgets preserves financial queries and saved recent limits', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  const financialRequests: string[] = []
  page.on('request', (request) => {
    if (/\/api\/(analytics\/|transactions\?)/.test(request.url()))
      financialRequests.push(request.url())
  })
  await fixture(page)
  await expect(page.locator('.dashboard-grid')).toBeVisible()
  const layout = () =>
    page.evaluate(
      () =>
        JSON.parse(
          localStorage.getItem('mono-finance.dashboard-preferences.v1')!,
        ).layout,
    )
  await expect.poll(async () => (await layout()).length).toBeGreaterThan(0)
  const requestsBefore = financialRequests.length
  const totalsBefore = await page
    .locator('.dashboard-kpis strong')
    .allTextContents()
  const move = async (selector: string, dx: number, dy: number) => {
    const control = page.locator(selector).first()
    await control.scrollIntoViewIfNeeded()
    const bounds = await control.boundingBox()
    await page.mouse.move(
      bounds!.x + bounds!.width / 2,
      bounds!.y + bounds!.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(
      bounds!.x + bounds!.width / 2 + dx,
      bounds!.y + bounds!.height / 2 + dy,
      { steps: 10 },
    )
    await page.mouse.up()
  }
  const beforeMove = await layout()
  await move('.dashboard-widget__handle', 300, 120)
  await expect.poll(layout).not.toEqual(beforeMove)
  const beforeResize = await layout()
  await move('.react-resizable-handle', 100, 60)
  await expect.poll(layout).not.toEqual(beforeResize)
  expect(financialRequests).toHaveLength(requestsBefore)
  expect(
    await page.locator('.dashboard-kpis strong').allTextContents(),
  ).toEqual(totalsBefore)
  for (const limit of [10, 20]) {
    await page.evaluate((limit) => {
      const key = 'mono-finance.dashboard-preferences.v1'
      const saved = JSON.parse(localStorage.getItem(key)!)
      localStorage.setItem(
        key,
        JSON.stringify({ ...saved, recentTransactionsLimit: limit }),
      )
    }, limit)
    await page.reload()
    await expect(page.locator('.dashboard-recent-card')).toBeVisible()
    expect(
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('mono-finance.dashboard-preferences.v1')!,
          ).recentTransactionsLimit,
      ),
    ).toBe(limit)
  }
})
