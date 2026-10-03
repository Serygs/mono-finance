import { expect, test, type Page } from '@playwright/test'
import {
  breakdowns,
  overview,
  trends,
  installFinanceApiMock,
} from './fixtures/finance-api'

test.use({ hasTouch: true })

test('desktop packing preserves the default mobile chart order and saved custom order', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  await installFinanceApiMock(page)
  await login(page)
  await expect(page.locator('.dashboard-grid')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = localStorage.getItem(
          'mono-finance.dashboard-preferences.v1',
        )
        return saved ? JSON.parse(saved).layout.length : 0
      }),
    )
    .toBeGreaterThan(0)
  await page.setViewportSize({ width: 390, height: 844 })
  const chartOrder = () =>
    page
      .locator('.dashboard-mobile-widgets .dashboard-widget-card')
      .evaluateAll((cards) =>
        cards.map((card) =>
          Array.from(card.classList).find((name) =>
            name.startsWith('dashboard-widget-card--'),
          ),
        ),
      )
  await expect
    .poll(chartOrder)
    .toEqual([
      'dashboard-widget-card--income-expenses',
      'dashboard-widget-card--spending-by-category',
      'dashboard-widget-card--spending-by-weekday',
      'dashboard-widget-card--spending-trend',
      'dashboard-widget-card--monthly-trend',
    ])
  await page.evaluate(() => {
    const key = 'mono-finance.dashboard-preferences.v1'
    const saved = JSON.parse(localStorage.getItem(key)!)
    const income = saved.layout.find(
      (item: { i: string }) => item.i === 'income-expenses',
    )
    const trend = saved.layout.find(
      (item: { i: string }) => item.i === 'spending-trend',
    )
    saved.layout = saved.layout.map(
      (item: { i: string; x: number; y: number }) => {
        if (item.i === 'spending-trend')
          return { ...item, x: income.x, y: income.y }
        if (item.i === 'income-expenses')
          return { ...item, x: trend.x, y: trend.y }
        return item
      },
    )
    localStorage.setItem(key, JSON.stringify(saved))
  })
  await page.reload()
  await expect
    .poll(async () => (await chartOrder())[0])
    .toBe('dashboard-widget-card--spending-trend')
})

test('saved category icons and colors take priority in recent rows and ranking', async ({
  page,
}) => {
  await installFinanceApiMock(page, {
    transactionCategory: {
      id: 'category-dining',
      name: 'Dining',
      source: 'custom',
    },
  })
  await page.route('**/api/categories', (route) =>
    route.fulfill({
      json: {
        data: {
          categories: [
            {
              id: 'category-dining',
              name: 'Dining',
              icon: 'home',
              colorToken: 'red',
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
          expensesByCategory: [
            {
              categoryId: 'category-dining',
              categoryName: 'Dining',
              amountMinor: 4000,
              currencyCode: 'UAH',
            },
          ],
        },
      },
    }),
  )
  await login(page)
  await expect(page.locator('.recent-transaction-icon')).toHaveClass(
    /ui-visual--red/,
  )
  const path = await page
    .locator('.recent-transaction-icon svg path')
    .first()
    .getAttribute('d')
  expect(path).toBe('m3 11 9-8 9 8')
  await expect(page.locator('.dashboard-rank-bar')).toHaveClass(
    /ui-visual--red/,
  )
})

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
}

test('mobile help survives the first tap, filters dismiss reliably, and chart details are quantitative', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await login(page)
  await expect(page.getByRole('button', { name: 'Profile' })).toBeHidden()
  const help = page.getByRole('button', { name: 'Total spent', exact: true })
  await help.tap()
  await expect(
    page.getByRole('dialog', { name: 'Total spent', exact: true }),
  ).toBeVisible()
  await page.mouse.move(1, 1)
  await expect(help).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')
  await expect(help).toHaveAttribute('aria-expanded', 'false')
  await expect(help).toBeFocused()
  await page.getByRole('button', { name: 'Overview actions' }).focus()
  await help.focus()
  await expect(help).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true })
  await expect(filters).toBeVisible()
  await filters.getByLabel('Currency').selectOption('base')
  await page.keyboard.press('Escape')
  await expect(filters).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Filters', exact: true }),
  ).toBeFocused()
  await expect(page.locator('.dashboard-filter-count')).toHaveText('1')
  await expect(
    page.getByRole('button', { name: 'Filters', exact: true }),
  ).toHaveAccessibleDescription('1 active filters')

  const income = page.locator('.dashboard-widget-card--income-expenses')
  await income
    .getByRole('button', { name: 'Chart details', exact: true })
    .click()
  const details = page.getByRole('dialog', {
    name: 'Chart details',
    exact: true,
  })
  await expect(details.locator('.ui-chart-details')).toHaveCount(7)
  await expect(details).toContainText('2025')
  await expect(details).toContainText('Net cash flow')
  await expect(details).toContainText('UAH 30.00')
  await page.keyboard.press('Escape')
  const weekday = page.locator('.dashboard-widget-card--spending-by-weekday')
  await weekday
    .getByRole('button', { name: 'Chart details', exact: true })
    .click()
  await expect(details).toContainText('Monday')
  await expect(details).toContainText('UAH 25.00')
  await expect(details.locator('.ui-chart-details').nth(2)).toContainText('2')
  await page.keyboard.press('Escape')
  await page
    .getByRole('link', { name: 'All transactions', exact: true })
    .click()
  await expect(page.locator('.transactions-page')).toBeVisible()
  await page.getByRole('link', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your finances, kept private.' }),
  ).toBeVisible()
})

test('Overview foregrounds meet contrast and mobile controls have full touch targets in both themes', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await login(page)
  for (const theme of ['light', 'dark']) {
    await page.evaluate((theme) => {
      localStorage.setItem('mono-finance-theme-v1', theme)
    }, theme)
    await page.reload()
    await expect(page.locator('.dashboard-recent-card')).toBeVisible()
    const measurements = await page.evaluate(() => {
      function luminance(color: string) {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            const srgb = value / 255
            return srgb <= 0.04045
              ? srgb / 12.92
              : ((srgb + 0.055) / 1.055) ** 2.4
          })
        return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722
      }
      function contrast(foreground: string, background: string) {
        const values = [luminance(foreground), luminance(background)].sort(
          (a, b) => b - a,
        )
        return (values[0]! + 0.05) / (values[1]! + 0.05)
      }
      const kpis = Array.from(
        document.querySelectorAll('.dashboard-kpis .ui-kpi'),
        (card) =>
          contrast(
            getComputedStyle(card.querySelector('strong')!).color,
            getComputedStyle(card).backgroundColor,
          ),
      )
      const text = contrast(
        getComputedStyle(
          document.querySelector('.recent-transaction-merchant small')!,
        ).color,
        getComputedStyle(document.querySelector('.dashboard-recent-card')!)
          .backgroundColor,
      )
      const chart = contrast(
        getComputedStyle(
          document.querySelector('.ui-chart-mobile-mark .income-bar')!,
        ).backgroundColor,
        getComputedStyle(
          document.querySelector('.dashboard-widget-card--income-expenses')!,
        ).backgroundColor,
      )
      const controls = Array.from(
        document.querySelectorAll(
          '.dashboard-page button, .dashboard-page select, .mobile-navigation a, .brand',
        ),
        (control) => {
          const rect = control.getBoundingClientRect()
          return {
            name: control.getAttribute('aria-label') ?? control.textContent,
            width: rect.width,
            height: rect.height,
          }
        },
      ).filter(
        (control) =>
          control.width > 0 &&
          control.height > 0 &&
          (control.width < 44 || control.height < 44),
      )
      return { kpis, text, chart, controls }
    })
    expect(
      measurements.kpis.every((ratio) => ratio >= 4.5),
      JSON.stringify({ theme, ...measurements }),
    ).toBe(true)
    expect(measurements.text).toBeGreaterThanOrEqual(4.5)
    expect(measurements.chart).toBeGreaterThanOrEqual(3)
    expect(measurements.controls).toEqual([])
    await page.screenshot({
      path: testInfo.outputPath(`dashboard-390-${theme}.png`),
      fullPage: true,
      animations: 'disabled',
    })
  }
})

test('desktop chart details support focus, hover and Escape within the viewport', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  await installFinanceApiMock(page)
  await login(page)
  const point = page
    .locator('.income-expense-plot .ui-chart-point button')
    .last()
  await point.focus()
  const details = page.locator('.ui-popover__content.ui-chart-point')
  await expect(details).toContainText('Net cash flow')
  const bounds = await details.boundingBox()
  expect(bounds!.x).toBeGreaterThanOrEqual(12)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(1428)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(920)
  await page.keyboard.press('Escape')
  await expect(details).toHaveCount(0)
  await point.hover()
  await expect(details).toBeVisible()
  await page.getByRole('heading', { name: 'Finance overview' }).click()
  await expect(details).toHaveCount(0)
  await page.screenshot({
    path: testInfo.outputPath('dashboard-1440-light.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await page.evaluate(() =>
    localStorage.setItem('mono-finance-theme-v1', 'dark'),
  )
  await page.reload()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('dashboard-1440-dark.png'),
    fullPage: true,
    animations: 'disabled',
  })
})

test('category expansion keeps percentages and separates the aggregate Other row', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.route('**/api/analytics/breakdowns?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...breakdowns,
          expensesByCategory: Array.from({ length: 8 }, (_, index) => ({
            amountMinor: 100,
            currencyCode: 'UAH',
            categoryId: `category-${index}`,
            categoryName: `Category ${index + 1}`,
          })),
        },
      },
    }),
  )
  await login(page)
  const widget = page.locator('.dashboard-widget-card--spending-by-category')
  await expect(widget.locator('.dashboard-rank-track')).toHaveCount(5)
  await expect(widget.locator('.dashboard-category-other')).toContainText(
    'UAH 3.00',
  )
  await expect(widget.locator('.dashboard-category-other')).toContainText(
    '37.5%',
  )
  await widget.getByRole('button', { name: 'View all categories' }).click()
  await expect(widget.locator('.bar-chart li')).toHaveCount(8)
  await expect(widget.locator('.dashboard-category-other')).toHaveCount(0)
  await expect(widget.locator('.bar-chart li').first()).toContainText('12.5%')
})

test('long names and exact large amounts wrap at 200% text scale in both themes and languages', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.route('**/api/analytics/overview?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...overview,
          totals: [
            {
              currencyCode: 'UAH',
              expenseAmountMinor: 9_007_199_254_740_991,
              incomeAmountMinor: 1,
              netAmountMinor: -9_007_199_254_740_990,
            },
          ],
        },
      },
    }),
  )
  await page.route('**/api/transactions?*', (route) =>
    route.fulfill({
      json: {
        data: {
          nextCursor: null,
          transactions: [
            {
              account: {
                id: 'account-1',
                type: 'Long synthetic account identity',
                maskedPan: '537541******1234',
              },
              category: { id: null, name: null, source: null },
              originalCategory: { id: null, name: null },
              originalDescription:
                'Synthetic merchant with a very long readable counterparty name',
              effectiveAmountMinor: 9_007_199_254_740_991,
              originalAmountMinor: 9_007_199_254_740_991,
              currencyCode: 'UAH',
              currencyMinorUnit: 2,
              originalTimestamp: 1_735_689_600,
              originalMcc: null,
              adjustmentNote: null,
              exclusionReason: null,
              hasAdjustment: false,
              hasCompensation: false,
              isExcluded: false,
              id: 'long-transaction',
            },
          ],
        },
      },
    }),
  )
  await login(page)
  for (const theme of ['light', 'dark'])
    for (const locale of ['en', 'uk']) {
      await page.evaluate(
        ({ theme, locale }) => {
          localStorage.setItem('mono-finance-theme-v1', theme)
          localStorage.setItem('mono-finance-locale-v1', locale)
        },
        { theme, locale },
      )
      await page.reload()
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 932 })
        await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        await expect(page.locator('.dashboard-kpis .ui-kpi')).toHaveCount(4)
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )
        expect(overflow).toBe(false)
        await page.screenshot({
          path: `phase2.local/states/large-${width}-${theme}-${locale}.png`,
          fullPage: true,
          animations: 'disabled',
        })
      }
    }
})

test('empty filters, loading and recoverable errors do not show misleading charts', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  let failure = true
  await page.route('**/api/analytics/trends?*', (route) =>
    route.fulfill(
      failure
        ? {
            status: 503,
            json: {
              error: { code: 'unavailable', message: 'Synthetic failure' },
            },
          }
        : {
            json: {
              data: { ...trends, daily: [], monthly: [], spendingTrend: [] },
            },
          },
    ),
  )
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-loading')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Retry analytics' }),
  ).toBeVisible()
  await page.screenshot({ path: 'phase2.local/states/error.png' })
  failure = false
  await page.getByRole('button', { name: 'Retry analytics' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  await expect(page.locator('.income-expense-plot')).toHaveCount(0)
  await page.route('**/api/transactions?*', (route) =>
    route.fulfill({ json: { data: { nextCursor: null, transactions: [] } } }),
  )
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('custom')
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByLabel('From', { exact: true }).fill('2025-01-01')
  await page.getByLabel('To', { exact: true }).fill('2025-01-07')
  await page.keyboard.press('Escape')
  await expect(page.locator('.dashboard-recent-card')).toContainText(
    'No transactions match these filters.',
  )
  await page.screenshot({
    path: 'phase2.local/states/empty-filters.png',
    fullPage: true,
  })
})
