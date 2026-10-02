import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { installCategoryApiMock } from './fixtures/category-api'
import { formatMoney } from '../../src/lib/money-presentation'
import { breakdowns } from './fixtures/finance-api'

test.use({ hasTouch: true })

async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
}
async function manage(page: Page) {
  await page.getByRole('link', { name: 'Manage', exact: true }).click()
}
async function bankTypes(page: Page) {
  await manage(page)
  await page.getByRole('link', { name: /Assign display categories/ }).click()
}

test('legacy links, subview history and preserved searches do not lose query/hash context', async ({
  page,
}) => {
  await installCategoryApiMock(page)
  await login(page)
  await page.goto('/settings?source=synthetic#categories')
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('7d')
  await manage(page)
  await page
    .getByLabel('Search categories', { exact: true })
    .fill('Personal category 7')
  await page.getByRole('link', { name: /Assign display categories/ }).click()
  await page.getByLabel('Search MCC or name', { exact: true }).fill('Remote')
  await expect(page.locator('.category-source-row')).toHaveCount(1)
  await expect(page).toHaveURL(
    /source=synthetic&categoryView=bank-types#categories$/,
  )
  await page.getByRole('link', { name: 'Back to category management' }).click()
  await expect(
    page.getByLabel('Search categories', { exact: true }),
  ).toHaveValue('Personal category 7')
  await page.goBack()
  await expect(
    page.getByLabel('Search MCC or name', { exact: true }),
  ).toHaveValue('Remote')
  await page.goBack()
  await expect(page.locator('.category-list > li')).toHaveCount(1)
  await page.goBack()
  await expect(
    page.getByRole('combobox', { name: 'Period', exact: true }),
  ).toHaveValue('7d')
  await expect(page).toHaveURL(/source=synthetic#categories$/)
  await page.goForward()
  await expect(page.locator('.category-list > li')).toHaveCount(1)
})

test('ranking keeps exact per-currency totals, custom visuals and income-specific insights', async ({
  page,
}) => {
  await installCategoryApiMock(page)
  await login(page)
  await page.goto('/settings#categories')
  const ranking = page
    .locator('.category-ranking')
    .filter({ has: page.getByText('Total spent · UAH', { exact: true }) })
  const total =
    2n * BigInt(Number.MAX_SAFE_INTEGER) +
    5000n * 6n -
    100n * (2n + 3n + 4n + 5n + 6n + 7n)
  await expect(ranking.locator('.category-analysis-summary strong')).toHaveText(
    formatMoney(total, { currencyCode: 'UAH', minorUnit: 2, locale: 'en' }),
  )
  await expect(ranking.locator('.category-ranking-list > li')).toHaveCount(5)
  await expect(ranking.locator('.category-ranking-other')).toContainText(
    '3 categories',
  )
  await expect(
    ranking.locator('.category-visual.ui-visual--purple').first(),
  ).toBeVisible()
  await expect(ranking.locator('.category-visual svg').first()).toBeVisible()
  const percent = await ranking
    .locator('.category-ranking-copy small')
    .first()
    .textContent()
  await ranking.getByRole('button', { name: 'View all categories' }).click()
  await expect(ranking.locator('.category-ranking-list > li')).toHaveCount(8)
  await expect(ranking.locator('.category-ranking-other')).toHaveCount(0)
  await expect(
    ranking.locator('.category-ranking-copy small').first(),
  ).toHaveText(percent!)
  await page.getByRole('button', { name: 'Income', exact: true }).click()
  await expect(page.getByText('Largest income category')).toBeVisible()
  await expect(page.getByText('Largest expense category')).toHaveCount(0)
  await expect(page.locator('.category-ranking')).toContainText(
    '100% of category income',
  )
  await page.route('**/api/analytics/breakdowns?*', (route) =>
    route.fulfill({
      json: {
        data: { ...breakdowns, incomeByCategory: [], expensesByCategory: [] },
      },
    }),
  )
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('90d')
  await expect(
    page.getByRole('heading', { name: 'No income in this period.' }),
  ).toBeVisible()
  await expect(page.getByText('No expenses in this period.')).toHaveCount(0)
})

test('server-wide source search/status filters reset pagination and empty results remain recoverable', async ({
  page,
}) => {
  await installCategoryApiMock(page)
  await login(page)
  await page.goto('/settings#categories')
  await bankTypes(page)
  await expect(page.getByText('Page 1 of 9 · 82 types')).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Page 2 of 9 · 82 types')).toBeVisible()
  const search = page.getByLabel('Search MCC or name', { exact: true })
  await search.fill('Remote')
  await expect(page.locator('.category-source-row')).toHaveCount(1)
  await expect(page.getByText('Page 1 of 1 · 1 types')).toBeVisible()
  await page.getByRole('button', { name: 'Bank category', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'No matching transaction types' }),
  ).toBeVisible()
  await expect(search).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Bank category', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Reset filters', exact: true })
    .first()
    .click()
  await expect(page.getByText('Page 1 of 9 · 82 types')).toBeVisible()
  await page
    .getByRole('button', { name: 'Assigned category', exact: true })
    .click()
  await expect(page.getByText('Page 1 of 3 · 28 types')).toBeVisible()
})

test('source picker works on first tap, keeps pending/error local and resets without touching bank records', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const fixture = await installCategoryApiMock(page)
  await login(page)
  await page.goto('/settings#categories')
  await bankTypes(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let fail = true
  await page.route('**/api/category-sources/mcc-5001', async (route) => {
    if (route.request().method() === 'PUT' && fail) {
      await gate
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'unavailable', message: 'Synthetic save failure' },
        },
      })
    }
    await route.fallback()
  })
  const row = page.locator('.category-source-row').nth(1)
  const trigger = row.getByRole('button', {
    name: 'Assigned category for Bank transaction type 2',
  })
  const original = { ...fixture.sources[1]! }
  await trigger.tap()
  const dialog = page.getByRole('dialog', {
    name: 'Assigned category for Bank transaction type 2',
  })
  await expect(dialog).toBeVisible()
  await dialog
    .getByLabel('Search categories', { exact: true })
    .fill('Personal category 7')
  await dialog
    .getByRole('button', { name: 'Personal category 7', exact: true })
    .tap()
  await expect(dialog).toHaveCount(0)
  await expect(row).toHaveAttribute('aria-busy', 'true')
  await expect(trigger).toHaveAttribute('aria-disabled', 'true')
  await expect(
    page.locator('.category-source-row').first().getByRole('button'),
  ).not.toHaveAttribute('aria-disabled', 'true')
  await page
    .getByLabel('Search MCC or name', { exact: true })
    .fill('No synthetic matches')
  await expect(page.locator('.category-source-row')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Reset filters', exact: true })
    .first()
    .click()
  await expect(trigger).toHaveAttribute('aria-disabled', 'true')
  await trigger.tap({ force: true })
  await expect(page.getByRole('dialog')).toHaveCount(0)
  release()
  await expect(row.getByRole('alert')).toContainText(
    'Transaction type could not be updated.',
  )
  fail = false
  await row.getByRole('button', { name: 'Retry' }).tap()
  await expect(row.getByRole('status')).toHaveText('Changes saved.')
  await expect(trigger).toContainText('Personal category 7')
  await trigger.tap()
  await page
    .getByRole('dialog')
    .getByRole('button', {
      name: 'Bank category Bank transaction type 2',
      exact: true,
    })
    .tap()
  await expect(trigger).toContainText('Bank category')
  expect(fixture.sources[1]!.originalName).toBe(original.originalName)
  expect(fixture.sources[1]!.code).toBe(original.code)
  expect(fixture.sources[1]!.transactionCount).toBe(original.transactionCount)
  expect(fixture.calls.writes.slice(-2).map((value) => value.method)).toEqual([
    'PUT',
    'DELETE',
  ])
  await expect(trigger).toBeFocused()
})

test('custom category creation/edit/merge/delete preserve protections, errors and analytics refresh', async ({
  page,
}) => {
  const fixture = await installCategoryApiMock(page)
  await login(page)
  await page.goto('/settings#categories')
  const initialAnalysis = fixture.calls.analysis
  await manage(page)
  await page.getByRole('button', { name: 'Add category', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Add category', exact: true })
  await editor.getByLabel('Name', { exact: true }).fill('   ')
  await editor
    .getByRole('button', { name: 'Add category', exact: true })
    .click()
  await expect(editor.getByRole('alert')).toHaveText('Enter a category name.')
  await editor
    .getByLabel('Name', { exact: true })
    .fill(' New household category ')
  const icon = editor.getByRole('radio', { name: 'Dining', exact: true })
  const color = editor.getByRole('radio', { name: 'Mint', exact: true })
  await editor
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: 'Dining', exact: true }) })
    .click()
  await editor
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: 'Mint', exact: true }) })
    .click()
  await expect(icon).toBeChecked()
  await expect(color).toBeChecked()
  await editor
    .getByRole('button', { name: 'Add category', exact: true })
    .click()
  await expect(editor).toHaveCount(0)
  await page
    .getByLabel('Search categories', { exact: true })
    .fill('New household')
  await expect(page.locator('.category-list > li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByLabel('Name', { exact: true })
    .fill('Edited household category')
  await page.getByRole('button', { name: 'Save category', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByLabel('Search categories', { exact: true })
    .fill('Edited household')
  await expect(page.locator('.category-list > li')).toHaveCount(1)
  await page.getByRole('button', { name: 'Merge', exact: true }).click()
  await page.getByLabel('Merge into').selectOption('personal-1')
  await page
    .getByRole('button', { name: 'Merge categories', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByLabel('Search categories', { exact: true })
    .fill('Personal category 8')
  await page.getByRole('button', { name: 'Category actions' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page
    .getByRole('button', { name: 'Delete category', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByLabel('Search categories', { exact: true })
    .fill('Dining and groceries')
  await page.getByRole('button', { name: 'Category actions' }).click()
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page
    .getByRole('button', { name: 'Delete category', exact: true })
    .click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Category could not be deleted.',
  )
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('link', { name: 'Analysis', exact: true }).click()
  await expect
    .poll(() => fixture.calls.analysis)
    .toBeGreaterThan(initialAnalysis)
  expect(fixture.calls.writes[0]!.body).toEqual({
    name: 'New household category',
    icon: 'dining',
    colorToken: 'mint',
  })
})

for (const locale of ['en', 'uk']) {
  for (const theme of ['light', 'dark']) {
    test(`narrow category layouts keep values and actions inside the viewport in ${locale} locale and ${theme} theme`, async ({
      page,
    }) => {
      test.setTimeout(60_000)
      await installCategoryApiMock(page)
      await login(page)
      mkdirSync('phase4.local/screenshots', { recursive: true })
      await page.evaluate(
        ({ locale, theme }) => {
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem('mono-finance-theme-v1', theme)
        },
        { locale, theme },
      )
      for (const width of [320, 375, 390, 430, 768, 1200, 1440]) {
        await page.setViewportSize({ width, height: 932 })
        for (const view of ['analysis', 'manage', 'bank-types']) {
          await page.goto(`/settings?categoryView=${view}#categories`)
          await expect(page.locator('.categories-page')).toBeVisible()
          await expect(
            page
              .locator(
                view === 'analysis'
                  ? '.category-ranking'
                  : view === 'manage'
                    ? '.category-list > li'
                    : '.category-source-row',
              )
              .first(),
          ).toBeVisible()
          const overflow = await page.evaluate(() => ({
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }))
          expect(overflow.scroll, `${locale} ${theme} ${width} ${view}`).toBe(
            overflow.client,
          )
          if (locale === 'en' && [390, 1440].includes(width))
            await page.screenshot({
              path: `phase4.local/screenshots/${view}-${width}-${theme}.png`,
              fullPage: true,
            })
        }
      }
    })
  }
}

test('enlarged category text keeps pickers and forms inside the viewport', async ({
  page,
}) => {
  await installCategoryApiMock(page)
  await login(page)
  await page.evaluate(() => {
    localStorage.setItem('mono-finance-locale-v1', 'uk')
    localStorage.setItem('mono-finance-theme-v1', 'dark')
  })
  mkdirSync('phase4.local/screenshots', { recursive: true })
  await page.setViewportSize({ width: 320, height: 844 })
  await page.goto('/settings?categoryView=bank-types#categories')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.locator('.category-source-row').first().getByRole('button').tap()
  const bounds = await page.getByRole('dialog').evaluate((dialog) => {
    const rect = dialog.getBoundingClientRect()
    return {
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  })
  expect(bounds.left).toBeGreaterThanOrEqual(0)
  expect(bounds.right).toBeLessThanOrEqual(bounds.width)
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.height)
  const enlarged = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    outside: Array.from(document.querySelectorAll('body *'))
      .filter(
        (element) =>
          element.getBoundingClientRect().right > window.innerWidth + 1,
      )
      .map((element) => `${element.tagName}.${element.className}`),
  }))
  await page.screenshot({
    path: 'phase4.local/screenshots/picker-320-enlarged.png',
    fullPage: true,
  })
  expect(enlarged.width, enlarged.outside.join(', ')).toBe(320)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.goto('/settings?categoryView=manage#categories')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await page.locator('.category-add-action').tap()
  await expect(page.getByRole('dialog').locator('form')).toBeVisible()
  const formLayout = await page
    .getByRole('dialog')
    .locator('form')
    .evaluate((form) => ({
      width: form.clientWidth,
      scroll: form.scrollWidth,
      outside: Array.from(form.querySelectorAll('*'))
        .filter(
          (element) =>
            element.getBoundingClientRect().right >
            form.getBoundingClientRect().right + 1,
        )
        .map((element) => `${element.tagName}.${element.className}`),
    }))
  expect(formLayout.scroll, formLayout.outside.join(', ')).toBeLessThanOrEqual(
    formLayout.width,
  )
  await page.setViewportSize({ width: 320, height: 480 })
  await page
    .getByRole('dialog')
    .getByRole('textbox')
    .fill('Long synthetic draft name')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^(Cancel|Скасувати)$/ })
    .scrollIntoViewIfNeeded()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^(Cancel|Скасувати)$/ })
    .tap()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('analytics and mapping loading/errors recover, filtered empties stay truthful and cached data stays visible offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installCategoryApiMock(page)
  await login(page)
  mkdirSync('phase4.local/states', { recursive: true })
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let fail = true
  await page.route('**/api/analytics/breakdowns?*', async (route) => {
    if (fail) {
      await gate
      return route.fulfill({
        status: 503,
        json: {
          error: { code: 'unavailable', message: 'Synthetic analytics error' },
        },
      })
    }
    await route.fallback()
  })
  await page.goto('/settings#categories')
  await expect(page.locator('.category-analysis .ui-skeleton')).toBeVisible()
  await page.screenshot({ path: 'phase4.local/states/analysis-loading.png' })
  release()
  await expect(
    page.locator('.category-analysis').getByRole('alert'),
  ).toContainText('Analytics could not be loaded.')
  await page.screenshot({ path: 'phase4.local/states/analysis-error.png' })
  fail = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('.category-ranking')).toHaveCount(2)
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('custom')
  await expect(page.getByRole('status')).toContainText(
    'Choose a valid date range.',
  )
  await page.getByRole('button', { name: 'Filters', exact: true }).tap()
  const filters = page.getByRole('dialog', { name: 'Filters', exact: true })
  await filters.getByLabel('From').fill('2025-01-15')
  await filters.getByLabel('To').fill('2025-01-14')
  await expect(page.getByRole('status')).toContainText(
    'Choose a valid date range.',
  )
  await filters.getByRole('button', { name: 'Reset filters' }).tap()
  await expect(filters).toHaveCount(0)
  await context.setOffline(true)
  await expect(page.locator('.offline-status')).toContainText('Offline')
  await expect(page.locator('.category-ranking')).toHaveCount(2)
  await page.screenshot({ path: 'phase4.local/states/analysis-offline.png' })
  await context.setOffline(false)
  let sourceFail = true
  await page.route('**/api/category-sources?*', async (route) =>
    sourceFail
      ? route.fulfill({
          status: 503,
          json: {
            error: { code: 'unavailable', message: 'Synthetic mapping error' },
          },
        })
      : route.fallback(),
  )
  await bankTypes(page)
  await expect(
    page.locator('.category-source-management').getByRole('alert'),
  ).toContainText('Transaction types could not be loaded.')
  await expect(
    page.getByLabel('Search MCC or name', { exact: true }),
  ).toBeVisible()
  sourceFail = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.locator('.category-source-row')).toHaveCount(10)
  await page
    .getByLabel('Search MCC or name', { exact: true })
    .fill('Impossible bank type')
  await expect(
    page.getByRole('heading', { name: 'No matching transaction types' }),
  ).toBeVisible()
  await page.screenshot({ path: 'phase4.local/states/source-empty.png' })
})

test('mobile category controls and chart colors meet touch/contrast targets, with keyboard picker focus return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installCategoryApiMock(page)
  await login(page)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => localStorage.setItem('mono-finance-theme-v1', theme),
      theme,
    )
    for (const view of ['analysis', 'manage', 'bank-types']) {
      await page.goto(`/settings?categoryView=${view}#categories`)
      await expect(
        page
          .locator(
            view === 'analysis'
              ? '.category-ranking'
              : view === 'manage'
                ? '.category-list'
                : '.category-source-list',
          )
          .first(),
      ).toBeVisible()
      const targets = await page
        .locator('.categories-page :is(button, select, input[type=search], a)')
        .evaluateAll((elements) =>
          elements
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => {
              const box = (
                element.matches('input[type=search]')
                  ? element.closest('label')!
                  : element
              ).getBoundingClientRect()
              return {
                name: element.textContent,
                width: box.width,
                height: box.height,
              }
            }),
        )
      for (const target of targets) {
        expect(target.width, target.name ?? '').toBeGreaterThanOrEqual(44)
        expect(target.height, target.name ?? '').toBeGreaterThanOrEqual(44)
      }
      const colors = await page.evaluate(() => {
        const selectors = [
          '.category-ranking-copy strong',
          '.category-ranking-copy small',
          '.category-source-identity span',
          '.category-list-row__name',
        ]
        const text = selectors.flatMap((selector) =>
          Array.from(document.querySelectorAll(selector))
            .filter((element) => element.getBoundingClientRect().width > 0)
            .map((element) => ({
              foreground: getComputedStyle(element).color,
              background: getComputedStyle(
                element.closest(
                  '.category-ranking, .category-source-list, .categories-list-panel',
                )!,
              ).backgroundColor,
              minimum: 4.5,
            })),
        )
        const bars = Array.from(
          document.querySelectorAll('.category-ranking-track i'),
        )
          .filter((element) => element.getBoundingClientRect().width > 0)
          .map((element) => ({
            foreground: getComputedStyle(element).backgroundColor,
            background: getComputedStyle(element.parentElement!)
              .backgroundColor,
            minimum: 3,
          }))
        const buttons = Array.from(
          document.querySelectorAll('.categories-page .ui-button--primary'),
        )
          .filter((element) => element.getBoundingClientRect().width > 0)
          .map((element) => ({
            foreground: getComputedStyle(element).color,
            background: getComputedStyle(element).backgroundColor,
            minimum: 4.5,
          }))
        return [...text, ...bars, ...buttons]
      })
      const luminance = (color: string) => {
        const channels = color
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
        const front = luminance(color.foreground)
        const back = luminance(color.background)
        expect(
          (Math.max(front, back) + 0.05) / (Math.min(front, back) + 0.05),
          `${theme} ${view} ${color.foreground}`,
        ).toBeGreaterThanOrEqual(color.minimum)
      }
    }
  }
  await page.setViewportSize({ width: 1440, height: 932 })
  const trigger = page
    .locator('.category-source-row')
    .first()
    .getByRole('button')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('dialog').getByLabel('Search categories', { exact: true }),
  ).toBeFocused()
  await page.screenshot({
    path: 'phase4.local/screenshots/picker-1440-dark.png',
  })
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
