import { expect, test, type Page, type Route } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { installFinanceApiMock } from './fixtures/finance-api'

// Screenshots use isolated API fixtures only, never private financial records.
const capture = process.env['PHASE5_CAPTURE']
test.use({ hasTouch: true, timezoneId: 'UTC' })

async function signIn(page: Page) {
  await page.goto('/login')
  await page.locator('#email').fill('owner@example.com')
  await page.locator('#password').fill('correct-password')
  await page.locator('.login-form button[type=submit]').click()
  await expect(page.locator('.dashboard-kpis')).toBeVisible()
}

function contrast(foreground: string, background: string) {
  const luminance = (color: string) => {
    const values = color
      .match(/[\d.]+/g)!
      .slice(0, 3)
      .map(Number)
      .map((channel) => {
        const value = channel / 255
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4
      })
    return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722
  }
  const a = luminance(foreground),
    b = luminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

test('account picker labels toggle once and checkboxes keep compact geometry', async ({
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
              code: 'UAH',
              minorUnit: 2,
              numericCode: '980',
              displayName: 'UAH',
            },
          })),
        },
      },
    }),
  )
  await signIn(page)
  const trigger = page.locator('.ui-multi-select__trigger')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('checkbox').first()).toBeFocused()
  const selectAll = page.getByRole('button', {
    name: 'Select all',
    exact: true,
  })
  await expect(selectAll).toBeDisabled()
  await expect(selectAll).toHaveClass(/ui-button--secondary/)
  const option = page.locator('.ui-multi-select__option').last()
  await option.locator('span').click()
  await expect(option.locator('input')).not.toBeChecked()
  await expect(trigger).toContainText('1 account')
  await expect(selectAll).toBeEnabled()
  const size = await option.locator('input').boundingBox()
  expect(size!.height).toBeLessThanOrEqual(20)
  expect(size!.width).toBeLessThanOrEqual(20)
  expect((await option.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await option.locator('span').tap()
  await expect(option.locator('input')).toBeChecked()
  await expect(selectAll).toBeDisabled()
  await page.keyboard.press('Space')
  await expect(option.locator('input')).not.toBeChecked()
  await selectAll.tap()
  await expect(page.getByRole('checkbox').first()).toBeFocused()
  await expect(selectAll).toBeDisabled()
  await expect(trigger).toContainText('All accounts')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  expect(await trigger.evaluate((node) => node.matches(':focus-visible'))).toBe(
    true,
  )
  await page.keyboard.press('Enter')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('checkbox').last()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.locator('.ui-multi-select__menu')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Filters', exact: true }),
  ).toBeFocused()
})

test('account picker stays disabled during loading and for an empty account response', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  let pending: Route | undefined
  await page.route('**/api/accounts', (route) => {
    pending = route
  })
  await signIn(page)
  const trigger = page.locator('.ui-multi-select__trigger')
  await expect(trigger).toBeDisabled()
  await expect(trigger).toHaveAttribute('aria-busy', 'true')
  await expect.poll(() => pending !== undefined).toBe(true)
  await pending!.fulfill({ json: { data: { accounts: [] } } })
  await expect(trigger).not.toHaveAttribute('aria-busy', 'true')
  await expect(trigger).toBeDisabled()
  await expect(page.locator('.ui-multi-select__menu')).toHaveCount(0)
})

test('period disclosure preserves exact boundaries and reporting context with keyboard focus return', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.setFixedTime(new Date('2025-01-30T12:00:00Z'))
  await installFinanceApiMock(page)
  await signIn(page)
  const period = page.locator('.analytics-period > button')
  await period.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Period', exact: true })
  await expect(dialog).toContainText('Exact period:')
  await expect(dialog).toContainText('Original currencies · effective amounts')
  await expect(dialog).toContainText('Without excluded transactions')
  await page.keyboard.press('Escape')
  await expect(period).toBeFocused()
  await page.getByRole('button', { name: 'Filters', exact: true }).tap()
  await page
    .getByRole('combobox', { name: 'Currency', exact: true })
    .selectOption('base')
  await page.getByRole('button', { name: 'Close', exact: true }).tap()
  await period.tap()
  await expect(dialog).toContainText('Converted report · effective amounts')
  await expect(dialog).toContainText('Without excluded transactions')
  await page.keyboard.press('Escape')
  await page.goto(
    '/transactions?period=custom&dateFrom=1735689600&dateTo=1738281599',
  )
  await page.locator('.analytics-period > button').tap()
  await expect(dialog).toContainText('Jan 1, 2025, 12:00 AM')
  await expect(dialog).toContainText('Jan 30, 2025, 11:59 PM')
})

test('unavailable freshness is announced and its retry recovers without changing finance scope', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  let failed = true
  await page.route('**/api/sync/transactions/status', (route) =>
    route.fulfill(
      failed
        ? {
            status: 503,
            json: { error: { code: 'unavailable', message: 'Unavailable' } },
          }
        : { json: { data: { syncStates: [] } } },
    ),
  )
  await signIn(page)
  await expect(
    page.locator('.data-freshness > .ui-popover > button'),
  ).toContainText('Status unavailable')
  await expect(page.locator('.data-freshness [role=status]')).toContainText(
    'could not be loaded',
  )
  await page.locator('.data-freshness button').tap()
  const dialog = page.getByRole('dialog', {
    name: 'Data freshness',
    exact: true,
  })
  await expect(dialog.locator('.ui-alert')).toContainText('could not be loaded')
  failed = false
  await dialog.getByRole('button', { name: 'Retry', exact: true }).tap()
  await expect(dialog.locator('.ui-alert')).toHaveCount(0)
  await expect(dialog).toContainText('History coverage unknown')
  await page.keyboard.press('Escape')
  await expect(page.locator('.data-freshness button')).toBeFocused()
  await expect(page.locator('.data-freshness button')).toContainText(
    'Data freshness',
  )
  await expect(page.locator('.dashboard-toolbar .ui-select')).toHaveValue('30d')
})

test('mobile dashboard measures its container before mounting draggable desktop widgets', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await installFinanceApiMock(page)
  await page.addInitScript(() => {
    const state = window as Window & { desktopGridMounted: boolean }
    state.desktopGridMounted = false
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (
            node instanceof Element &&
            (node.matches('.dashboard-grid') ||
              node.querySelector('.dashboard-grid'))
          )
            state.desktopGridMounted = true
    }).observe(document, { childList: true, subtree: true })
  })
  await signIn(page)
  await expect(page.locator('.dashboard-mobile-widgets')).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (window as Window & { desktopGridMounted: boolean }).desktopGridMounted,
    ),
  ).toBe(false)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320,
  )
  await expect(page.locator('.react-resizable-handle')).toHaveCount(0)
})
for (const locale of ['en', 'uk'])
  for (const theme of ['light', 'dark']) {
    test(`finance chrome fits narrow and enlarged layouts in ${locale}/${theme}`, async ({
      page,
    }) => {
      test.setTimeout(120_000)
      await page.clock.setFixedTime(new Date('2025-01-30T12:00:00Z'))
      await installFinanceApiMock(page)
      await page.route('**/api/sync/transactions/status', (route) =>
        route.fulfill({
          json: {
            data: {
              syncStates: [
                {
                  accountId: 'account-1',
                  accountType: 'black',
                  currencyCode: 'UAH',
                  status: 'idle',
                  lastErrorCode: null,
                  lastSuccessfulSyncAt: 1736856000,
                  coverageIntervals: [
                    {
                      fromEpochSeconds: 1736683200,
                      toEpochSeconds: 1736856000,
                      completedAt: 1736856000,
                    },
                  ],
                },
              ],
            },
          },
        }),
      )
      await page.addInitScript(
        ({ locale, theme }) => {
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem('mono-finance-theme-v1', theme)
        },
        { locale, theme },
      )
      const metrics: unknown[] = []
      const snapshot = async (screen: string, width: number) => {
        if (!capture || ![390, 1440].includes(width)) return
        await page.screenshot({
          path: `phase5-ui.local/${capture}/${screen}-${width}-${locale}-${theme}.png`,
          animations: 'disabled',
        })
      }
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto('/login')
        await expect(page.locator('.login-form')).toBeVisible()
        await snapshot('login', width)
      }
      await page.locator('#email').fill('owner@example.com')
      await page.locator('#password').fill('correct-password')
      await page.locator('.login-form button[type=submit]').click()
      await expect(page.locator('.dashboard-recent-card')).toBeVisible()
      for (const [url, screen, content] of [
        ['/', 'dashboard', '.dashboard-kpis'],
        ['/transactions', 'transactions', '.transactions-ledger'],
        ['/settings#categories', 'category-analysis', '.category-ranking'],
        [
          '/settings?categoryView=manage#categories',
          'category-management',
          '.categories-management',
        ],
        [
          '/settings?categoryView=bank-types#categories',
          'mcc',
          '.category-source-management',
        ],
        ['/#accounts', 'accounts', '.accounts-list'],
        ['/settings', 'settings', '.settings-layout'],
      ]) {
        await page.goto(url!)
        await expect(page.locator(content!).first()).toBeVisible()
        await expect(page.locator('.ui-skeleton:visible')).toHaveCount(0)
        for (const width of [1440, 1200, 768, 430, 390, 375, 320]) {
          await page.setViewportSize({ width, height: 900 })
          await expect
            .poll(
              () =>
                page.evaluate(
                  () => document.documentElement.scrollWidth <= innerWidth,
                ),
              { message: `${screen} ${width} ${locale}/${theme}` },
            )
            .toBe(true)
          await snapshot(screen!, width)
          if (
            width === 390 &&
            ['dashboard', 'transactions', 'category-analysis'].includes(screen!)
          ) {
            const primaryContent = page.locator(content!).first()
            expect(
              (await primaryContent.boundingBox())!.y,
              `${screen} first viewport`,
            ).toBeLessThan(screen === 'dashboard' ? 320 : 420)
            for (const selector of [
              '.analytics-period > button',
              '.data-freshness > .ui-popover > button',
            ]) {
              const control = page.locator(selector).filter({ visible: true })
              const pair = await control.evaluate((node) => ({
                text: getComputedStyle(node).color,
                background: getComputedStyle(node).backgroundColor,
              }))
              expect(
                contrast(pair.text, pair.background),
                `${selector} ${locale}/${theme}`,
              ).toBeGreaterThanOrEqual(4.5)
              expect(
                (await control.boundingBox())!.height,
              ).toBeGreaterThanOrEqual(44)
            }
          }
          metrics.push({
            screen,
            width,
            locale,
            theme,
            contentTop: await page
              .locator(content!)
              .first()
              .evaluate((node) => Math.round(node.getBoundingClientRect().top)),
          })
          if (screen === 'dashboard' && [390, 1440].includes(width)) {
            await page.locator('.ui-multi-select__trigger').click()
            await snapshot('account-picker', width)
            await page.keyboard.press('Escape')
          }
          if (
            width === 390 &&
            ['dashboard', 'transactions', 'category-analysis'].includes(screen!)
          ) {
            const freshness = page
              .locator('.data-freshness > .ui-popover > button')
              .filter({ visible: true })
            await expect(freshness).toContainText(
              locale === 'en' ? 'Import gaps' : 'Прогалини імпорту',
            )
            await freshness.tap()
            await expect(page.getByRole('dialog')).toContainText(
              locale === 'en'
                ? 'Elapsed portion has unverified gaps'
                : 'У минулій частині періоду є неперевірені проміжки',
            )
            await snapshot(`${screen}-freshness`, width)
            await page.keyboard.press('Escape')
            await expect(freshness).toBeFocused()
          }
        }
        await page.addStyleTag({ content: 'html { font-size: 200%; }' })
        await expect
          .poll(
            () =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
              ),
            { message: `${screen} doubled text ${locale}/${theme}` },
          )
          .toBe(true)
        if (
          ['dashboard', 'transactions', 'category-analysis'].includes(screen!)
        ) {
          await page
            .locator('.analytics-period > button')
            .filter({ visible: true })
            .tap()
          const dialog = page.getByRole('dialog')
          await expect(dialog).toBeVisible()
          const bounds = await dialog
            .locator('.ui-overlay__surface')
            .boundingBox()
          expect(bounds!.x).toBeGreaterThanOrEqual(0)
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320)
          await page.keyboard.press('Escape')
        }
      }
      if (capture) {
        await mkdir(`phase5-ui.local/${capture}`, { recursive: true })
        await writeFile(
          `phase5-ui.local/${capture}/metrics-${locale}-${theme}.json`,
          JSON.stringify(metrics, null, 2),
        )
      }
    })
  }
