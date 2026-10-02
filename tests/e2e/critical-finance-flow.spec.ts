import { expect, test } from '@playwright/test'
import {
  highVarianceTrends,
  installFinanceApiMock,
} from './fixtures/finance-api'

test('an owner can complete the critical private-finance workflow', async ({
  page,
}) => {
  await installFinanceApiMock(page)

  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Finance overview' }),
  ).toBeVisible()

  const periodRequest = page.waitForRequest((request) =>
    request.url().includes('/api/analytics/overview'),
  )
  const periodSelect = page.getByRole('combobox', {
    exact: true,
    name: 'Period',
  })
  await expect(periodSelect).toHaveValue('30d')
  await expect(
    page.getByRole('heading', { name: 'Currency distribution' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Month-end forecast' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('heading', { name: 'Top merchants' }),
  ).toHaveCount(0)
  await periodSelect.selectOption('7d')
  await periodRequest
  await expect(periodSelect).toHaveValue('7d')

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
  await page.getByRole('button', { name: 'Overview actions' }).click()
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  await page.getByLabel('recent corrections').check()
  await page.getByLabel('recent compensations').check()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(
    page.getByRole('heading', { name: 'Recent corrections' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Recent compensations' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Profile' }).click()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Your finances, kept private.' }),
  ).toBeVisible()
})

test('language and category type mapping remain accessible', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Language').selectOption('uk')
  await expect(
    page.getByRole('heading', { name: 'Ваші фінанси залишаються приватними.' }),
  ).toBeVisible()
  await page.getByLabel('Електронна пошта').fill('owner@example.com')
  await page.getByLabel('Пароль').fill('correct-password')
  await page.getByRole('button', { name: 'Увійти' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')

  await expect(
    page.getByRole('heading', { name: 'Огляд фінансів' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Категорії' }).first().click()
  const sourceSelect = page.getByLabel('Категорія для mcc-5812')
  await expect(sourceSelect).toBeVisible()
  await sourceSelect.selectOption('category-dining')
  await expect(sourceSelect).toHaveValue('category-dining')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await expect(
    page.getByRole('heading', { name: 'Категорії', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Ще' }).first().click()
  await expect(page.getByRole('heading', { name: 'Ще' })).toBeVisible()
  await page
    .locator('.settings-page--grouped')
    .getByLabel('\u041c\u043e\u0432\u0430')
    .selectOption('en')
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()
})

test('theme segments remain centered and untruncated across responsive widths', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'More' }).first().click()
  await expect(page.getByRole('heading', { name: 'More' })).toBeVisible()

  for (const width of [1440, 1152, 390]) {
    await page.setViewportSize({ width, height: 932 })
    const layout = await page.evaluate(() => {
      const track = document.querySelector('.ui-segmented-control__track')!
      const trackRect = track.getBoundingClientRect()
      const segments = Array.from(
        track.querySelectorAll('button'),
        (button) => {
          const label = button.querySelector('.ui-segmented-control__label')!
          return {
            height: button.getBoundingClientRect().height,
            labelScrollWidth: label.scrollWidth,
            labelWidth: label.clientWidth,
            left: button.getBoundingClientRect().left,
            right: button.getBoundingClientRect().right,
          }
        },
      )
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        segments,
        trackLeft: trackRect.left,
        trackRight: trackRect.right,
      }
    })

    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(layout.segments).toHaveLength(3)
    expect(
      layout.segments.every(
        (segment) => Math.abs(segment.height - layout.segments[0].height) < 0.1,
      ),
    ).toBe(true)
    expect(
      layout.segments.every(
        (segment) =>
          segment.labelScrollWidth <= segment.labelWidth &&
          segment.left >= layout.trackLeft &&
          segment.right <= layout.trackRight,
      ),
    ).toBe(true)
  }

  await page.getByRole('button', { name: 'Dark', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})

test('overview switches to a single-column mobile composition without viewport overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 430, height: 932 })
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(
    page.getByRole('heading', { name: 'Finance overview' }),
  ).toBeVisible()
  await expect(page.locator('.dashboard-kpis .ui-kpi')).toHaveCount(4)
  await expect(
    page.locator(
      '.weekday-vertical-chart .ui-chart-mobile-mark .weekday-bars > span',
    ),
  ).toHaveCount(7)
  expect(
    await page
      .locator(
        '.weekday-vertical-chart .ui-chart-mobile-mark .weekday-bars > span',
      )
      .evaluateAll(
        (bars) =>
          bars.filter((bar) => bar.getBoundingClientRect().height > 3).length,
      ),
  ).toBeGreaterThan(0)

  const layout = await page.evaluate(() => ({
    appShell: document.querySelector('.app-shell')!.getBoundingClientRect(),
    body: document.body.getBoundingClientRect(),
    clientWidth: document.documentElement.clientWidth,
    dashboardRight: document
      .querySelector('.dashboard-page')!
      .getBoundingClientRect().right,
    filtersRight: document
      .querySelector('.dashboard-toolbar')!
      .getBoundingClientRect().right,
    filterFields: Array.from(
      document.querySelectorAll('.dashboard-toolbar .ui-field'),
      (field) => field.getBoundingClientRect(),
    ).filter((field) => field.width > 0 && field.height > 0),
    visibleFilterMenuTriggers: Array.from(
      document.querySelectorAll(
        '.dashboard-advanced-filters > .ui-popover__trigger',
      ),
      (trigger) => trigger.getBoundingClientRect(),
    ).filter((trigger) => trigger.width > 0 && trigger.height > 0),
    primaryKpis: Array.from(
      document.querySelectorAll('.dashboard-kpis .ui-kpi'),
      (card) => card.getBoundingClientRect(),
    ),
    syncActions: Array.from(
      document.querySelectorAll('.dashboard-toolbar-actions .ui-button'),
      (button) => button.getBoundingClientRect(),
    ),
    undersizedControls: Array.from(
      document.querySelectorAll('input, select, textarea'),
      (control) => ({
        className: control.className,
        fontSize: Number.parseFloat(getComputedStyle(control).fontSize),
        tagName: control.tagName,
      }),
    ).filter((control) => control.fontSize < 16),
    headerRight: document.querySelector('.app-header')!.getBoundingClientRect()
      .right,
    headerActions: document
      .querySelector('.app-header-actions')!
      .getBoundingClientRect(),
    root: document.querySelector('#root')!.getBoundingClientRect(),
    scrollWidth: document.documentElement.scrollWidth,
    viewport: document
      .querySelector('meta[name="viewport"]')
      ?.getAttribute('content'),
    bodyOverflowX: getComputedStyle(document.body).overflowX,
  }))

  expect(layout.viewport).toContain('width=device-width')
  expect(layout.viewport).toContain('initial-scale=1')
  expect(layout.bodyOverflowX).toBe('visible')
  expect(layout.scrollWidth).toBe(layout.clientWidth)
  expect(layout.body.left).toBe(0)
  expect(layout.body.right).toBe(layout.clientWidth)
  expect(layout.root.left).toBe(0)
  expect(layout.root.right).toBe(layout.clientWidth)
  expect(layout.appShell.left).toBe(0)
  expect(layout.appShell.right).toBe(layout.clientWidth)
  expect(layout.headerRight).toBe(layout.clientWidth)
  expect(layout.headerActions.right).toBeLessThanOrEqual(layout.clientWidth)
  expect(layout.dashboardRight).toBeLessThanOrEqual(layout.clientWidth)
  expect(layout.filtersRight).toBeLessThanOrEqual(layout.clientWidth)
  expect(layout.filterFields).toHaveLength(2)
  expect(layout.visibleFilterMenuTriggers).toHaveLength(1)
  expect(layout.primaryKpis).toHaveLength(4)
  expect(layout.syncActions).toHaveLength(0)
  expect(layout.undersizedControls).toEqual([])

  for (const width of [320, 375, 390, 767]) {
    await page.setViewportSize({ width, height: 844 })
    const mobileLayout = await page.evaluate(() => ({
      appShell: document.querySelector('.app-shell')!.getBoundingClientRect(),
      clientWidth: document.documentElement.clientWidth,
      headerActions: document
        .querySelector('.app-header-actions')!
        .getBoundingClientRect(),
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(mobileLayout.scrollWidth).toBe(mobileLayout.clientWidth)
    expect(mobileLayout.appShell.left).toBe(0)
    expect(mobileLayout.appShell.right).toBe(mobileLayout.clientWidth)
    expect(mobileLayout.headerActions.right).toBeLessThanOrEqual(
      mobileLayout.clientWidth,
    )
  }

  await page.setViewportSize({ width: 215, height: 932 })
  const zoomedLayout = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(zoomedLayout.scrollWidth).toBe(zoomedLayout.clientWidth)
})

test('core finance screens fit a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 })
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  for (const path of ['/', '/transactions', '/settings']) {
    await page.goto(path)
    await expect(page.locator('main')).toBeVisible()
    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflowingControls: Array.from(
        document.querySelectorAll('button, input, select'),
        (element) => element.getBoundingClientRect(),
      ).filter((rect) => rect.right > document.documentElement.clientWidth),
    }))

    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(layout.overflowingControls).toEqual([])
  }

  await page.setViewportSize({ width: 540, height: 720 })
  await page.goto('/settings#categories')
  const sourceTableWidth = await page
    .locator('.category-source-table-wrap')
    .evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))
  expect(sourceTableWidth.scrollWidth).toBe(sourceTableWidth.clientWidth)
})

test('custom category form stays compact until the owner opens it', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('link', { name: 'Categories' }).first().click()
  await expect(page.getByRole('heading', { name: 'Add category' })).toHaveCount(
    0,
  )
  await page.getByRole('button', { name: '+ Add category' }).click()
  await expect(
    page.getByRole('heading', { name: 'Add category' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('heading', { name: 'Add category' })).toHaveCount(
    0,
  )
})

test('category delete menu escapes clipped surfaces on desktop and mobile', async ({
  page,
}) => {
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.getByRole('link', { name: 'Categories' }).first().click()

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.getByRole('button', { name: 'Category actions' }).click()
    const bounds = await page
      .getByRole('button', { name: 'Delete' })
      .evaluate((button) => {
        const rect = button.getBoundingClientRect()
        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          viewportHeight: window.innerHeight,
          viewportWidth: window.innerWidth,
        }
      })

    expect(bounds.left).toBeGreaterThanOrEqual(8)
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth - 8)
    expect(bounds.top).toBeGreaterThanOrEqual(8)
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight - 8)
    await page.getByRole('button', { name: 'Delete' }).click()
    await expect(
      page.getByRole('heading', { name: 'Delete category?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await page.keyboard.press('Escape')
  }
})

test('mobile dashboard customization persists visible widgets without grid editing', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  await page.getByRole('button', { name: 'Overview actions' }).click()
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  const topMerchants = page
    .getByRole('dialog', { name: 'Customize dashboard' })
    .getByRole('checkbox', { name: 'Top merchants' })
  await topMerchants.check()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(
    page.getByRole('heading', { name: 'Top merchants' }),
  ).toBeVisible()
  await expect(page.locator('.dashboard-grid')).toHaveCount(0)

  await page.reload()
  await page.getByRole('button', { name: 'Overview actions' }).click()
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  await expect(topMerchants).toBeChecked()
  await page.getByRole('button', { name: 'Restore default widgets' }).click()
  await expect(topMerchants).not.toBeChecked()
})

test('income and expense bars retain one baseline across responsive widths', async ({
  page,
}) => {
  await installFinanceApiMock(page, { trendsOverride: highVarianceTrends })
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 932 })
    await expect(page.locator('.income-expense-plot > div')).toHaveCount(7)
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth ===
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true)
    const layout = await page.evaluate(() => {
      const plot = document.querySelector('.income-expense-plot')!
      const plotRect = plot.getBoundingClientRect()
      const groups = Array.from(plot.children, (group) => {
        const bars = Array.from(
          group.querySelectorAll('.income-expense-bars'),
        ).find((element) => element.getBoundingClientRect().height > 0)!
        const label = group.querySelector('small')!
        return {
          barBottom: bars.getBoundingClientRect().bottom,
          labelLeft: label.getBoundingClientRect().left,
          labelRight: label.getBoundingClientRect().right,
          values: Array.from(
            bars.querySelectorAll('span'),
            (bar) => bar.getBoundingClientRect().height,
          ),
        }
      })
      return {
        clientWidth: document.documentElement.clientWidth,
        groups,
        plotLeft: plotRect.left,
        plotRight: plotRect.right,
        scrollWidth: document.documentElement.scrollWidth,
      }
    })

    expect(layout.scrollWidth).toBe(layout.clientWidth)
    expect(
      layout.groups.every(
        (group) => Math.abs(group.barBottom - layout.groups[0].barBottom) < 0.1,
      ),
    ).toBe(true)
    expect(
      layout.groups.every(
        (group) =>
          group.labelLeft >= layout.plotLeft &&
          group.labelRight <= layout.plotRight,
      ),
    ).toBe(true)
    expect(layout.groups[3].values[1]).toBeGreaterThan(
      layout.groups[0].values[1],
    )
  }
})
