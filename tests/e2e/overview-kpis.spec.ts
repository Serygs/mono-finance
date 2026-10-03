import { expect, test, type Page } from '@playwright/test'
import { installFinanceApiMock, overview } from './fixtures/finance-api'

test.use({ hasTouch: true })

async function openOverview(page: Page) {
  await page.clock.setFixedTime(new Date('2025-01-30T12:00:00Z'))
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.dashboard-kpis strong')).toHaveCount(4)
}

test('all four KPI actions preserve scope and support keyboard navigation and independent help', async ({
  page,
}) => {
  const analyticsRequests: URL[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/analytics/overview')
      analyticsRequests.push(new URL(request.url()))
  })
  await openOverview(page)
  await page
    .getByRole('combobox', { name: 'Period', exact: true })
    .selectOption('90d')
  const metrics = [
    'Total spent',
    'Total income',
    'Net cash flow',
    'Average spend / day',
  ]
  const directions = ['expense', 'income', null, 'expense']
  const baseline = analyticsRequests.at(-1)!.searchParams
  for (const [index, metric] of metrics.entries()) {
    const card = page.locator('.dashboard-kpis .ui-kpi').nth(index)
    const link = card.getByRole('link', {
      name: `View transactions for ${metric} · UAH`,
      exact: true,
    })
    await expect(card.getByRole('link')).toHaveCount(1)
    await expect(
      card.locator('a button, button a, a a, button button'),
    ).toHaveCount(0)
    const destination = new URL((await link.getAttribute('href'))!, page.url())
    expect(destination.pathname).toBe('/transactions')
    expect(destination.searchParams.get('direction')).toBe(directions[index])
    expect(destination.searchParams.get('currency')).toBe('UAH')
    expect(destination.searchParams.get('excluded')).toBe('false')
    expect(destination.searchParams.get('period')).toBe('custom')
    expect(destination.searchParams.get('accountScope')).toBe('explicit')
    for (const key of ['dateFrom', 'dateTo', 'accountId'])
      expect(destination.searchParams.getAll(key)).toEqual(baseline.getAll(key))

    const overviewUrl = page.url()
    const help = card.getByRole('button', { name: metric, exact: true })
    await help.click()
    await expect(
      page.getByRole('dialog', { name: metric, exact: true }),
    ).toBeVisible()
    expect(page.url()).toBe(overviewUrl)
    await page.keyboard.press('Escape')
    await expect(help).toBeFocused()
    await link.focus()
    await page.keyboard.press('Tab')
    await page.keyboard.press('Shift+Tab')
    await expect(link).toBeFocused()
    await expect(card).toHaveCSS('outline-style', 'solid')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(destination.toString())
    await page.goBack()
    await expect(page.locator('.dashboard-kpis strong')).toHaveCount(4)
  }
  // Clicking the metric title is also part of the main card action.
  const title = await page
    .getByRole('heading', { name: 'Total spent', exact: true })
    .boundingBox()
  await page.mouse.click(
    title!.x + title!.width / 2,
    title!.y + title!.height / 2,
  )
  await expect(page).toHaveURL(/\/transactions\?/)
})

for (const locale of ['en', 'uk'])
  for (const theme of ['light', 'dark']) {
    test(`KPI layout, large values and touch help in ${locale}/${theme}`, async ({
      page,
    }, testInfo) => {
      await openOverview(page)
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page
          .locator('.dashboard-kpis')
          .screenshot({ path: testInfo.outputPath(`kpis-normal-${width}.png`) })
      }
      await page.route('**/api/analytics/overview?*', (route) =>
        route.fulfill({
          json: {
            data: {
              ...overview,
              totals: [
                {
                  currencyCode: 'UAH',
                  expenseAmountMinor: 123456789012345,
                  incomeAmountMinor: 234567890123456,
                  netAmountMinor: 111111101111111,
                },
              ],
              averageExpensePerDay: [
                { currencyCode: 'UAH', amountMinor: 12345678901234 },
              ],
            },
          },
        }),
      )
      await page.evaluate(
        ({ locale, theme }) => {
          localStorage.setItem('mono-finance-locale-v1', locale)
          localStorage.setItem('mono-finance-theme-v1', theme)
        },
        { locale, theme },
      )
      await page.reload()
      await expect(page.locator('.dashboard-kpis strong')).toHaveCount(4)
      const values = await page
        .locator('.dashboard-kpis strong')
        .allTextContents()
      for (const width of [1440, 1200, 768, 430, 390, 375, 320]) {
        await page.setViewportSize({ width, height: 900 })
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          )
          .toBe(true)
        const layout = await page
          .locator('.dashboard-kpis')
          .evaluate((summary) => {
            const cards = Array.from(summary.querySelectorAll('.ui-kpi'))
            return {
              columns:
                getComputedStyle(summary).gridTemplateColumns.split(' ').length,
              cards: cards.map((card) => {
                const value = card
                  .querySelector('.ui-kpi__amounts')!
                  .getBoundingClientRect()
                const chevron = card
                  .querySelector('.ui-kpi__chevron')!
                  .getBoundingClientRect()
                const link = card.querySelector('a')!
                const help = card.querySelector('button')!
                return {
                  gap: chevron.left - value.right,
                  link: {
                    width: link.getBoundingClientRect().width,
                    height: link.getBoundingClientRect().height,
                  },
                  help: {
                    width: help.getBoundingClientRect().width,
                    height: help.getBoundingClientRect().height,
                  },
                  fontSize: getComputedStyle(card.querySelector('strong')!)
                    .fontSize,
                  tabular: getComputedStyle(
                    card.querySelector('.ui-kpi__value')!,
                  ).fontVariantNumeric,
                  decoration: getComputedStyle(link).textDecorationLine,
                  label: link.getAttribute('aria-label'),
                }
              }),
            }
          })
        if (width < 768) expect(layout.columns).toBe(2)
        for (const card of layout.cards) {
          expect(card.gap).toBeGreaterThanOrEqual(12)
          expect(card.link.width).toBeGreaterThanOrEqual(44)
          expect(card.link.height).toBeGreaterThanOrEqual(44)
          expect(card.help.width).toBeGreaterThanOrEqual(44)
          expect(card.help.height).toBeGreaterThanOrEqual(44)
          expect(card.fontSize).toBe(width < 768 ? '20px' : '24px')
          expect(card.tabular).toBe('tabular-nums')
          expect(card.decoration).toBe('none')
          expect(card.label).toContain(
            locale === 'uk' ? 'Переглянути операції' : 'View transactions',
          )
        }
        expect(
          await page.locator('.dashboard-kpis strong').allTextContents(),
        ).toEqual(values)
        if (width === 1440 || width === 390)
          await page
            .locator('.dashboard-kpis')
            .screenshot({ path: testInfo.outputPath(`kpis-${width}.png`) })
      }
      const help = page.locator('.ui-kpi__help button').first()
      const url = page.url()
      await help.tap()
      await expect(
        page.getByRole('dialog', {
          name: (await help.getAttribute('aria-label'))!,
          exact: true,
        }),
      ).toBeVisible()
      expect(page.url()).toBe(url)
      await page.keyboard.press('Escape')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const transition = await page
        .locator('.ui-kpi__action')
        .first()
        .evaluate(
          (link) => getComputedStyle(link, '::after').transitionDuration,
        )
      expect(transition).toBe('0s')
    })
  }

test('multi-currency cards retain each existing currency destination behind one action', async ({
  page,
}) => {
  await openOverview(page)
  await page.route('**/api/analytics/overview?*', (route) =>
    route.fulfill({
      json: {
        data: {
          ...overview,
          totals: overview.totals.concat([
            { ...overview.totals[0]!, currencyCode: 'USD' },
          ]),
          averageExpensePerDay: overview.averageExpensePerDay.concat([
            { amountMinor: 500, currencyCode: 'USD' },
          ]),
        },
      },
    }),
  )
  await page.reload()
  await expect(page.locator('.dashboard-kpis strong')).toHaveCount(8)
  const card = page.locator('.ui-kpi').first()
  await expect(card.getByRole('link')).toHaveCount(0)
  const picker = card.getByRole('button', {
    name: 'View transactions: Total spent',
    exact: true,
  })
  await picker.focus()
  await page.keyboard.press('Space')
  const choices = page.getByRole('dialog', {
    name: 'View transactions: Total spent',
    exact: true,
  })
  await expect(choices.getByRole('link')).toHaveCount(2)
  for (const currency of ['UAH', 'USD']) {
    const href = await choices
      .getByRole('link', {
        name: `View transactions for Total spent · ${currency}`,
        exact: true,
      })
      .getAttribute('href')
    expect(new URL(href!, page.url()).searchParams.get('currency')).toBe(
      currency,
    )
  }
  await choices
    .getByRole('link', {
      name: 'View transactions for Total spent · USD',
      exact: true,
    })
    .click()
  await expect(page).toHaveURL(/currency=USD/)
})

test('converted and empty totals retain their existing unavailable drill-down behavior', async ({
  page,
}) => {
  await openOverview(page)
  for (const state of ['converted', 'empty']) {
    await page.route('**/api/analytics/overview?*', (route) =>
      route.fulfill({
        json: {
          data: {
            ...overview,
            ...(state === 'empty'
              ? { totals: [], averageExpensePerDay: [] }
              : {
                  currencyConversion: {
                    ...overview.currencyConversion,
                    mode: 'base',
                    baseCurrencyCode: 'UAH',
                  },
                }),
          },
        },
      }),
    )
    await page.reload()
    await expect(page.locator('.dashboard-kpis .ui-kpi')).toHaveCount(4)
    await expect(
      page.locator(
        '.dashboard-kpis a, .dashboard-kpis .ui-kpi__picker, .dashboard-kpis .ui-kpi__chevron',
      ),
    ).toHaveCount(0)
    await expect(
      page.locator('.dashboard-kpis .ui-kpi__help button'),
    ).toHaveCount(4)
  }
})
