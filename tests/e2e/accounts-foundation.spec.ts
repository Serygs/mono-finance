import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { installFinanceApiMock } from './fixtures/finance-api'
import type { AccountSummary } from '../../src/features/accounts/account-types'

test.use({ hasTouch: true })

const syntheticAccounts: AccountSummary[] = [
  account(
    'black-one',
    'black',
    Number.MAX_SAFE_INTEGER,
    'UAH',
    2,
    '537541******1234',
  ),
  account('white-two', 'white', Number.MAX_SAFE_INTEGER, 'UAH', 2),
  account('dollars', 'platinum', -125050, 'USD', 2),
  account('euros', 'white', 0, 'EUR', 2),
  account('yen', 'black', 1200, 'JPY', 0),
  account(
    'dinars',
    'A supplied account type with a long readable identifier',
    12345,
    'BHD',
    3,
  ),
  account('unknown', 'other', -125050, '999', 0),
]
function account(
  id: string,
  type: string,
  balanceMinor: number,
  code: string,
  minorUnit: number,
  maskedPan?: string,
): AccountSummary {
  return {
    id,
    type,
    balanceMinor,
    cards: maskedPan ? [{ id: `${id}-card`, isActive: true, maskedPan }] : [],
    creditLimitMinor: null,
    currency: { code, minorUnit, displayName: code, numericCode: code },
    isActive: id !== 'euros',
  }
}
async function fixture(page: Page) {
  await installFinanceApiMock(page)
  const state = {
    rows: [...syntheticAccounts],
    failLoad: false,
    failSync: false,
    syncCount: 0,
    loading: false,
    release: () => {},
  }
  await page.route('**/api/accounts', async (route) => {
    if (state.loading)
      await new Promise<void>((resolve) => {
        state.release = resolve
      })
    await route.fulfill({
      status: state.failLoad ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        state.failLoad
          ? { error: { code: 'unavailable', message: 'Synthetic failure' } }
          : { data: { accounts: state.rows } },
      ),
    })
  })
  await page.route('**/api/sync/accounts', async (route) => {
    state.syncCount++
    await new Promise<void>((resolve) => {
      state.release = resolve
    })
    await route.fulfill({
      status: state.failSync ? 429 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        state.failSync
          ? {
              error: {
                code: 'sync_rate_limited',
                message: 'Synthetic rate limit',
              },
            }
          : { data: { accounts: state.rows } },
      ),
    })
  })
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Finance overview' }),
  ).toBeVisible()
  await page.goto('/#accounts')
  return state
}

test('exact original-currency balances, supplied identity and stable visuals survive sync reordering', async ({
  page,
}) => {
  const state = await fixture(page)
  await expect(
    page.locator('.accounts-currency-summary strong').first(),
  ).toHaveText('UAH\u00a0180,143,985,094,819.82')
  await expect(
    page.locator('[data-account-id=dollars] .account-row__balance'),
  ).toHaveText('-USD\u00a01,250.50')
  await expect(
    page.locator('[data-account-id=euros] .account-row__balance'),
  ).toHaveText('EUR\u00a00.00')
  await expect(
    page.locator('[data-account-id=yen] .account-row__balance'),
  ).toHaveText('JPY\u00a01,200')
  await expect(
    page.locator('[data-account-id=dinars] .account-row__balance'),
  ).toHaveText('BHD\u00a012.345')
  await expect(
    page.locator('[data-account-id=unknown] .account-row__balance'),
  ).toHaveText('\u2212125,050 minor units \u00b7 ISO 999')
  await expect(page.locator('.accounts-list-section > header')).toContainText(
    '7 accounts',
  )
  await expect(page.locator('.accounts-balance-summary')).not.toContainText(
    'accounts',
  )
  await expect(page.locator('.accounts-list :is(button,a)')).toHaveCount(0)
  await expect(page.locator('[data-account-id=black-one]')).toContainText(
    '•••• 1234',
  )
  await expect(page.locator('[data-account-id=dinars]')).toContainText(
    syntheticAccounts[5]!.type,
  )
  const visual = await page
    .locator('[data-account-id=dinars] .account-row__visual')
    .getAttribute('class')
  state.rows.reverse()
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).click()
  await expect.poll(() => state.syncCount).toBe(1)
  await page
    .getByRole('link', { name: 'Overview', exact: true })
    .first()
    .click()
  await page
    .getByRole('link', { name: 'Accounts', exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Syncing accounts…' }),
  ).toBeDisabled()
  state.release()
  await expect(
    page.getByText(
      'Account balances updated. Transaction history sync is separate.',
    ),
  ).toBeVisible()
  await expect(
    page.locator('[data-account-id=dinars] .account-row__visual'),
  ).toHaveAttribute('class', visual!)
})

test('sync failure and retry preserve balances and guard repeats, with offline and keyboard help', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await fixture(page)
  const balance = page.locator(
    '[data-account-id=dollars] .account-row__balance',
  )
  await expect(balance).toBeVisible()
  state.failSync = true
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(
    page.getByRole('button', { name: 'Syncing accounts\u2026' }),
  ).toBeDisabled()
  await expect(balance).toBeVisible()
  await expect.poll(() => state.syncCount).toBe(1)
  state.release()
  await expect(page.getByRole('alert')).toContainText(
    'Accounts could not be synchronized',
  )
  await page.waitForTimeout(350)
  expect(state.syncCount).toBe(1)
  state.failSync = false
  state.rows = state.rows.map((row) =>
    row.id === 'dollars' ? { ...row, balanceMinor: -20000 } : row,
  )
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect.poll(() => state.syncCount).toBe(2)
  await expect(balance).toHaveText('-USD\u00a01,250.50')
  state.release()
  await expect(balance).toHaveText('-USD\u00a0200.00')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await context.setOffline(true)
  await expect(
    page.getByRole('button', { name: 'Sync accounts', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText(
      'Connect to the internet to sync accounts. Previously loaded balances remain visible.',
    ),
  ).toBeVisible()
  await expect(balance).toBeVisible()
  await context.setOffline(false)
  const help = page.getByRole('button', {
    name: 'Account balances',
    exact: true,
  })
  await help.tap()
  await expect(
    page.getByText('Balances are shown in their original currencies.'),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(help).toBeFocused()
})

test('load errors and empty accounts remain recoverable without fabricated freshness', async ({
  page,
}) => {
  const state = await fixture(page)
  state.failLoad = true
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Accounts could not be loaded. Try again later.',
  )
  state.failLoad = false
  state.rows = []
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'No synchronized accounts' }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Sync accounts', exact: true }),
  ).toHaveCount(1)
  state.rows = [...syntheticAccounts]
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).click()
  await expect.poll(() => state.syncCount).toBe(1)
  state.release()
  await expect(page.locator('.account-row')).toHaveCount(7)
  await expect(page.locator('.accounts-page')).not.toContainText('Last sync')
})

test('responsive balances and controls fit both locales/themes, enlarged text and loading states', async ({
  page,
}) => {
  test.setTimeout(90000)
  const state = await fixture(page)
  mkdirSync('phase5.local/screenshots', { recursive: true })
  for (const locale of ['en', 'uk'])
    for (const theme of ['light', 'dark'])
      for (const width of [320, 375, 390, 430, 768, 1200, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(
          ({ locale, theme }) => {
            localStorage.setItem('mono-finance-locale-v1', locale)
            localStorage.setItem('mono-finance-theme-v1', theme)
          },
          { locale, theme },
        )
        await page.reload()
        await expect(page.locator('.account-row')).toHaveCount(7)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        for (const element of await page
          .locator('.account-row__balance, .accounts-currency-summary strong')
          .all()) {
          expect(
            await element.evaluate(
              (el) => el.scrollWidth <= el.clientWidth + 1,
            ),
          ).toBe(true)
        }
        if (locale === 'en' && [390, 1440].includes(width))
          await page.screenshot({
            path: `phase5.local/screenshots/accounts-${width}-${theme}.png`,
            fullPage: true,
          })
      }
  await page.setViewportSize({ width: 320, height: 844 })
  for (const locale of ['en', 'uk'])
    for (const theme of ['light', 'dark']) {
      await page.evaluate(
        ({ locale, theme }) => {
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem('mono-finance-theme-v1', theme)
        },
        { locale, theme },
      )
      await page.reload()
      await page.addStyleTag({ content: 'html {font-size:32px !important}' })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      for (const element of await page
        .locator('.account-row__balance, .accounts-currency-summary strong')
        .all())
        expect(
          await element.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true)
    }
  state.loading = true
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.accounts-page .ui-skeleton')).toBeVisible()
  state.release()
  await expect(page.locator('.account-row')).toHaveCount(7)
})

test('account text and visuals meet contrast, mobile hit targets and keyboard focus remain visible', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await fixture(page)
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (theme) => localStorage.setItem('mono-finance-theme-v1', theme),
      theme,
    )
    await page.reload()
    await expect(page.locator('.account-row')).toHaveCount(7)
    for (const button of await page.locator('.accounts-page button').all()) {
      const box = await button.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
    const pairs = await page
      .locator(
        '.accounts-currency-summary :is(strong,span), .account-row__balance, .account-row__identity strong, .account-row__metadata > span, .account-row__visual, .accounts-page .ui-button',
      )
      .evaluateAll((elements) =>
        elements.map((el) => {
          let parent: Element | null = el
          let background = 'rgba(0, 0, 0, 0)'
          while (parent !== null && background === 'rgba(0, 0, 0, 0)') {
            background = getComputedStyle(parent).backgroundColor
            parent = parent.parentElement
          }
          return {
            foreground: getComputedStyle(el).color,
            background,
            minimum: el.matches('.account-row__visual') ? 3 : 4.5,
          }
        }),
      )
    function luminance(color: string) {
      const values = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map((value) => Number(value) / 255)
        .map((value) =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        )
      return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722
    }
    for (const pair of pairs) {
      const first = luminance(pair.foreground),
        second = luminance(pair.background)
      expect(
        (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05),
        `${theme} ${JSON.stringify(pair)}`,
      ).toBeGreaterThanOrEqual(pair.minimum)
    }
  }
  const sync = page.getByRole('button', { name: 'Sync accounts', exact: true })
  await sync.focus()
  await expect(sync).toBeFocused()
  expect(
    await sync.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none')
})
