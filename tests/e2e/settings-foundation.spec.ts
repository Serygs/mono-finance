import { UKRAINIAN_MESSAGES } from '../../src/features/localization/messages'
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { installFinanceApiMock } from './fixtures/finance-api'

test.use({ hasTouch: true })
const syncStates = [
  {
    accountId: 'running',
    accountType: 'black',
    currencyCode: 'UAH',
    status: 'running',
    lastSuccessfulSyncAt: 1735689600,
    lastErrorCode: null,
  },
  {
    accountId: 'failed',
    accountType: 'white',
    currencyCode: 'USD',
    status: 'failed',
    lastSuccessfulSyncAt: null,
    lastErrorCode: 'provider_error',
  },
  {
    accountId: 'ready',
    accountType: 'platinum',
    currencyCode: 'EUR',
    status: 'idle',
    lastSuccessfulSyncAt: 1735689600,
    lastErrorCode: null,
  },
  {
    accountId: 'new',
    accountType: 'yellow',
    currencyCode: 'JPY',
    status: 'idle',
    lastSuccessfulSyncAt: null,
    lastErrorCode: null,
  },
]
async function fixture(page: Page) {
  mkdirSync('phase6.local/screenshots', { recursive: true })
  await installFinanceApiMock(page)
  const state = {
    currency: 'UAH',
    failCurrency: false,
    failStatus: false,
    failSave: false,
    failRates: false,
    saveCount: 0,
    ratesCount: 0,
    holdSave: false,
    holdRates: false,
    release: () => {},
  }
  await page.route('**/api/preferences/currency', async (route) => {
    const method = route.request().method()
    if (method === 'PUT') {
      state.saveCount++
      if (state.holdSave)
        await new Promise<void>((resolve) => {
          state.release = resolve
        })
      if (!state.failSave)
        state.currency = (
          route.request().postDataJSON() as { baseCurrencyCode: string }
        ).baseCurrencyCode
    }
    const failed = method === 'PUT' ? state.failSave : state.failCurrency
    await route.fulfill({
      status: failed ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        failed
          ? {
              error: {
                code: 'synthetic_failure',
                message: 'Synthetic failure',
              },
            }
          : { data: { baseCurrencyCode: state.currency } },
      ),
    })
  })
  await page.route('**/api/exchange-rates/sync', async (route) => {
    state.ratesCount++
    if (state.holdRates)
      await new Promise<void>((resolve) => {
        state.release = resolve
      })
    await route.fulfill({
      status: state.failRates ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        state.failRates
          ? {
              error: {
                code: 'synthetic_failure',
                message: 'Synthetic failure',
              },
            }
          : { data: {} },
      ),
    })
  })
  await page.route('**/api/sync/transactions/status', (route) =>
    route.fulfill({
      status: state.failStatus ? 503 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        state.failStatus
          ? {
              error: {
                code: 'synthetic_failure',
                message: 'Synthetic failure',
              },
            }
          : { data: { syncStates } },
      ),
    }),
  )
  await page.route('**/api/accounts', (route) =>
    route.fulfill({
      json: {
        data: {
          accounts: syncStates.map((item) => ({
            id: item.accountId,
            type: item.accountType,
            currency: {
              code: item.currencyCode,
              minorUnit: 2,
              numericCode: '000',
              displayName: item.currencyCode,
            },
            cards: [],
            isActive: true,
            balanceMinor: 10000,
            creditLimitMinor: null,
          })),
        },
      },
    }),
  )
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  await page.getByRole('link', { name: 'More', exact: true }).first().click()
  return state
}

test('theme follows the device, language updates every navigation immediately and both preferences persist', async ({
  page,
}) => {
  await fixture(page)
  await expect(page.locator('.settings-row--theme legend')).toHaveText('Theme')
  await expect(
    page.locator('.settings-page').getByText('Theme', { exact: true }),
  ).toHaveCount(1)
  await page.getByRole('button', { name: 'System', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('button', { name: 'Language', exact: true }).click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Ukrainian', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await expect(page.locator('.mobile-navigation')).toContainText(
    UKRAINIAN_MESSAGES.Accounts,
  )
  await page
    .getByRole('link', { name: UKRAINIAN_MESSAGES.Accounts, exact: true })
    .first()
    .click()
  await expect(
    page.getByRole('heading', {
      name: UKRAINIAN_MESSAGES.Accounts,
      exact: true,
    }),
  ).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/settings')
  await page
    .getByRole('button', { name: UKRAINIAN_MESSAGES.Language, exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: UKRAINIAN_MESSAGES.English, exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'More', exact: true }),
  ).toBeVisible()
})

test('currency validation, pending/failure/success and exchange-rate updates refresh analytics without rewriting account/ledger currencies', async ({
  page,
}) => {
  const state = await fixture(page)
  const trigger = page.getByRole('button', {
    name: 'Base currency',
    exact: true,
  })
  await trigger.click()
  const field = page.getByLabel('Base currency (ISO 4217)')
  await field.fill('12')
  await page
    .getByRole('button', { name: 'Save base currency', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Enter a three-letter currency code.',
  )
  expect(state.saveCount).toBe(0)
  state.holdSave = true
  state.failSave = true
  await field.fill('eur')
  await page
    .getByRole('button', { name: 'Save base currency', exact: true })
    .click()
  await expect.poll(() => state.saveCount).toBe(1)
  await expect(
    page.getByRole('button', { name: 'Saving…', exact: true }),
  ).toBeDisabled()
  state.release()
  await expect(page.getByRole('alert')).toContainText(
    'Currency settings could not be updated.',
  )
  state.failSave = false
  await page
    .getByRole('button', { name: 'Save base currency', exact: true })
    .click()
  await expect.poll(() => state.saveCount).toBe(2)
  state.release()
  await expect(
    page.getByText('Currency settings updated.', { exact: true }),
  ).toBeVisible()
  await expect(trigger).toContainText('EUR')
  state.holdRates = true
  await page
    .getByRole('button', { name: 'Update exchange rates', exact: true })
    .click()
  await expect.poll(() => state.ratesCount).toBe(1)
  await expect(
    page.getByRole('button', { name: 'Updating…', exact: true }),
  ).toBeDisabled()
  state.release()
  await expect(
    page.getByText('Exchange rates updated.', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(trigger).toBeFocused()
  await page
    .getByRole('link', { name: 'Overview', exact: true })
    .first()
    .click()
  const overviewRequest = page.waitForRequest(
    (request) =>
      request.url().includes('/api/analytics/overview') &&
      new URL(request.url()).searchParams.get('baseCurrency') === 'EUR',
  )
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page
    .getByRole('combobox', { name: 'Currency', exact: true })
    .selectOption('base')
  await overviewRequest
  await page.keyboard.press('Escape')
  await page
    .getByRole('link', { name: 'Accounts', exact: true })
    .first()
    .click()
  await expect(page.locator('.account-row__balance').first()).toContainText(
    'UAH',
  )
})

test('sync status reports actual running/failure/time state, and errors/cached status remain recoverable offline', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const state = await fixture(page)
  const trigger = page.getByRole('button', { name: 'Sync status', exact: true })
  await trigger.tap()
  const list = page.locator('.settings-sync-details__list')
  await expect(
    list.getByText('Sync in progress', { exact: true }),
  ).toBeVisible()
  await expect(
    list.getByText('Sync needs retry', { exact: true }),
  ).toBeVisible()
  await expect(list.getByText(/Transaction sync succeeded/)).toHaveCount(2)
  await expect(list.getByText('Not synced yet', { exact: true })).toBeVisible()
  await expect(page.getByRole('dialog')).toContainText(
    'Older history may still be incomplete.',
  )
  await page.screenshot({ path: 'phase6.local/screenshots/sync-390.png' })
  state.failStatus = true
  await page
    .getByRole('button', { name: 'Refresh status', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Transaction sync status could not be loaded.',
  )
  await expect(
    list.getByText('Sync in progress', { exact: true }),
  ).toBeVisible()
  state.failStatus = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await context.setOffline(true)
  await expect(
    page.getByRole('button', { name: 'Refresh status', exact: true }),
  ).toBeDisabled()
  await expect(list).toBeVisible()
  await context.setOffline(false)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})

test('logout blocks repeats, announces failure, preserves the session on API failure and clears the encrypted cache', async ({
  page,
}) => {
  await fixture(page)
  await expect
    .poll(async () =>
      page.evaluate(async () =>
        (await indexedDB.databases()).some(
          (database) => database.name === 'mono-finance-offline-v1',
        ),
      ),
    )
    .toBe(true)
  let count = 0,
    fail = true,
    release = () => {}
  await page.route('**/api/auth/logout', async (route) => {
    count++
    await new Promise<void>((resolve) => {
      release = resolve
    })
    if (fail)
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'synthetic_failure', message: 'Synthetic failure' },
        }),
      })
    else await route.fallback()
  })
  await page.locator('.settings-sign-out').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('.settings-sign-out')).toBeDisabled()
  await expect(
    page.getByRole('status').getByText('Signing out…', { exact: true }),
  ).toBeVisible()
  await expect.poll(() => count).toBe(1)
  release()
  await expect(page.getByRole('alert')).toContainText(
    'Unable to sign out. Try again.',
  )
  await expect(
    page.getByRole('heading', { name: 'More', exact: true }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(async () =>
        (await indexedDB.databases()).some(
          (database) => database.name === 'mono-finance-offline-v1',
        ),
      ),
    )
    .toBe(false)
  fail = false
  await page.locator('.settings-sign-out').click()
  await expect.poll(() => count).toBe(2)
  release()
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Your finances, kept private.' }),
  ).toBeVisible()
})

test('More fits every breakpoint in both themes/locales, at enlarged text and in keyboard-sized sheets', async ({
  page,
}) => {
  test.setTimeout(90000)
  await fixture(page)
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
        await expect(page.locator('.settings-layout')).toBeVisible()
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width} ${locale} ${theme}`,
        ).toBe(true)
        if (locale === 'en' && [390, 1440].includes(width))
          await page.screenshot({
            path: `phase6.local/screenshots/more-${width}-${theme}.png`,
            fullPage: true,
          })
      }
  for (const locale of ['en', 'uk'])
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width: 320, height: 844 })
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
        `${locale} ${theme} enlarged`,
      ).toBe(true)
      await page
        .locator('.settings-row-popover')
        .nth(1)
        .getByRole('button')
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      await page.keyboard.press('Escape')
    }
  await page.setViewportSize({ width: 390, height: 480 })
  await page.evaluate(() =>
    localStorage.setItem('mono-finance-locale-v1', 'en'),
  )
  await page.reload()
  await page.getByRole('button', { name: 'Base currency', exact: true }).tap()
  await page.getByLabel('Base currency (ISO 4217)').focus()
  await expect(
    page.getByRole('button', { name: 'Save base currency', exact: true }),
  ).toBeInViewport()
  await expect(
    page.getByRole('button', { name: 'Cancel', exact: true }),
  ).toBeInViewport()
})

test('More load failures recover, and offline currency actions retain the saved setting', async ({
  page,
  context,
}) => {
  const state = await fixture(page)
  state.failCurrency = true
  await page.reload()
  await page.getByRole('button', { name: 'Base currency', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Currency settings could not be loaded.',
  )
  state.failCurrency = false
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(page.getByLabel('Base currency (ISO 4217)')).toHaveValue('UAH')
  await context.setOffline(true)
  await expect(
    page.getByRole('button', { name: 'Save base currency', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Update exchange rates', exact: true }),
  ).toBeDisabled()
  await expect(
    page.getByText('Connect to the internet to update settings.'),
  ).toBeVisible()
  await context.setOffline(false)
  state.failRates = true
  await page
    .getByRole('button', { name: 'Update exchange rates', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Currency settings could not be updated.',
  )
  expect(state.ratesCount).toBe(1)
})

test('Overview transaction refresh invalidates the cached ledger and updates More status without duplicate sync actions', async ({
  page,
}) => {
  await fixture(page)
  let ledgerCalls = 0,
    syncCalls = 0
  await page.route('**/api/transactions?*', async (route) => {
    ledgerCalls++
    await route.fallback()
  })
  await page.route('**/api/sync/transactions', async (route) => {
    syncCalls++
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          sync: {
            accountId: 'running',
            importedCount: 1,
            skippedDuplicateCount: 0,
            status: 'synchronized',
            window: {
              fromEpochSeconds: 1735689600,
              toEpochSeconds: 1735776000,
            },
          },
        },
      }),
    })
  })
  await page
    .getByRole('link', { name: 'Transactions', exact: true })
    .first()
    .click()
  await expect(page.getByRole('button', { name: /Restaurant/ })).toBeVisible()
  await page
    .getByRole('link', { name: 'Overview', exact: true })
    .first()
    .click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  const originalCalls = ledgerCalls
  await page.route('**/api/sync/transactions/status', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          syncStates: syncStates.map((state) => ({
            ...state,
            status: 'idle',
            lastSuccessfulSyncAt: 1735776000,
          })),
        },
      }),
    }),
  )
  await page
    .getByRole('button', { name: 'Overview actions', exact: true })
    .click()
  await page.getByRole('button', { name: 'Sync status', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page
    .getByRole('button', { name: 'Refresh transactions', exact: true })
    .click()
  await expect(
    page.getByRole('dialog').getByText(/Transaction sync succeeded/),
  ).toHaveCount(4)
  expect(syncCalls).toBe(1)
  await page.keyboard.press('Escape')
  await page
    .getByRole('link', { name: 'Transactions', exact: true })
    .first()
    .click()
  await expect.poll(() => ledgerCalls).toBeGreaterThan(originalCalls)
  await page.getByRole('link', { name: 'More', exact: true }).first().click()
  await page.getByRole('button', { name: 'Sync status', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByText(/Transaction sync succeeded/),
  ).toHaveCount(4)
})

test('More foregrounds, selected controls and SVGs meet contrast and mobile hit targets', async ({
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
    for (const button of await page.locator('.settings-page button').all()) {
      const box = await button.boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
      expect(box!.width).toBeGreaterThanOrEqual(44)
    }
    const pairs = await page
      .locator(
        '.settings-row__copy :is(strong,small), .settings-row__trailing, .settings-row__icon, .settings-row--theme button, .settings-group h2',
      )
      .evaluateAll((elements) =>
        elements.map((el) => {
          let parent: Element | null = el,
            background = 'rgba(0, 0, 0, 0)'
          while (parent !== null && background === 'rgba(0, 0, 0, 0)') {
            background = getComputedStyle(parent).backgroundColor
            parent = parent.parentElement
          }
          return {
            foreground: getComputedStyle(el).color,
            background,
            minimum: el.matches('.settings-row__icon') ? 3 : 4.5,
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
})
