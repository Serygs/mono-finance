import { expect, test } from '@playwright/test'
import type { DashboardPreferences } from '../../src/features/dashboard/dashboard-preferences'
import { installFinanceApiMock } from './fixtures/finance-api'

test.beforeEach(async ({ page }) => {
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
})

test('legacy hash adapters preserve query state, active navigation and browser history', async ({
  page,
}) => {
  await page.goto('/?source=synthetic#accounts')
  await expect(page.locator('.accounts-page')).toBeVisible()
  await expect(
    page.locator('.desktop-navigation [aria-current="page"]'),
  ).toHaveAttribute('href', '/#accounts')
  await expect(page).toHaveURL(/\?source=synthetic#accounts$/)
  await page
    .getByRole('link', { name: 'Categories', exact: true })
    .first()
    .click()
  await expect(page.locator('.categories-page')).toBeVisible()
  await expect(
    page.locator('.desktop-navigation [aria-current="page"]'),
  ).toHaveAttribute('href', '/settings#categories')
  await page.goBack()
  await expect(page.locator('.accounts-page')).toBeVisible()
  await expect(page).toHaveURL(/\?source=synthetic#accounts$/)
  await page.goForward()
  await expect(page.locator('.categories-page')).toBeVisible()
  await page.goto('/settings?source=synthetic#categories')
  await expect(page.locator('.categories-page')).toBeVisible()
  await expect(page).toHaveURL(/\?source=synthetic#categories$/)
  await page.goto('/settings?source=synthetic#unknown')
  await expect(page.locator('.settings-page')).toBeVisible()
  await expect(page).toHaveURL(/\?source=synthetic#unknown$/)
})

test('desktop widget resize, reorder and visibility persist without refetching financial data', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  await expect(page.locator('.dashboard-grid')).toBeVisible()
  let financialRequests = 0
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname
    if (path.startsWith('/api/analytics/') || path === '/api/transactions')
      financialRequests++
  })
  const storedLayout = () =>
    page.evaluate(() =>
      localStorage.getItem('mono-finance.dashboard-preferences.v1'),
    )
  const initial = await storedLayout()
  const widget = page
    .locator('.dashboard-widget')
    .filter({ has: page.locator('.dashboard-widget-card--income-expenses') })
  await widget.scrollIntoViewIfNeeded()
  await widget.locator('.react-resizable-handle-se').scrollIntoViewIfNeeded()
  const resize = await widget
    .locator('.react-resizable-handle-se')
    .boundingBox()
  expect(resize).not.toBeNull()
  expect(resize!.width).toBeGreaterThan(20)
  await page.mouse.move(
    resize!.x + resize!.width / 2,
    resize!.y + resize!.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    resize!.x + resize!.width / 2 - 90,
    resize!.y + resize!.height / 2 - 70,
    { steps: 8 },
  )
  await page.mouse.up()
  await expect.poll(storedLayout).not.toBe(initial)
  const resized = await storedLayout()
  const handle = await widget.locator('.dashboard-widget__handle').boundingBox()
  expect(handle).not.toBeNull()
  await page.mouse.move(handle!.x + 5, handle!.y + 5)
  await page.mouse.down()
  await page.mouse.move(handle!.x + 5, handle!.y + 350, { steps: 8 })
  await page.mouse.up()
  await expect.poll(storedLayout).not.toBe(resized)
  await page.getByRole('button', { name: 'Overview actions' }).click()
  await page.getByRole('button', { name: 'Customize dashboard' }).click()
  await page.getByLabel('Top merchants', { exact: true }).check()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Top merchants' }),
  ).toBeVisible()
  expect(financialRequests).toBe(0)
  const persisted = JSON.parse((await storedLayout())!) as DashboardPreferences
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Top merchants' }),
  ).toBeVisible()
  const restored = JSON.parse((await storedLayout())!) as DashboardPreferences
  expect(restored.layout).toEqual(persisted.layout)
  expect(new Set(restored.enabledWidgetIds)).toEqual(
    new Set(persisted.enabledWidgetIds),
  )
  expect(restored.recentTransactionsLimit).toBe(
    persisted.recentTransactionsLimit,
  )
})

test('overview and ledger use one correction workflow with focus return', async ({
  page,
}) => {
  const overviewRow = page.locator('.recent-transaction-row').first()
  await overviewRow.click()
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  await page.getByLabel('Effective amount (UAH)').fill('-10.00')
  await page.getByLabel('Note').fill('Shared dinner')
  await page.getByRole('button', { name: 'Save adjustment' }).click()
  await expect(page.getByText('Original:')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.ui-overlay--sheet')).toHaveCount(0)
  await expect(overviewRow).toBeFocused()
  await page
    .getByRole('link', { name: 'Transactions', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: /Restaurant/ }).click()
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  await expect(page.getByLabel('Effective amount (UAH)')).toHaveValue('-10.00')
  await page.getByRole('button', { name: 'Reset adjustment' }).click()
  await expect(page.getByText('Original:')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page
    .getByRole('link', { name: 'Overview', exact: true })
    .first()
    .click()
  const customize = page.getByRole('button', { name: 'Customize dashboard' })
  await page.getByRole('button', { name: 'Overview actions' }).click()
  await customize.click()
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Customize dashboard' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Overview actions' }),
  ).toBeFocused()
})

test('keyboard skip preserves legacy pages and default hashes retain the correct active tab', async ({
  page,
}) => {
  for (const [url, owner, active] of [
    ['/?source=synthetic#accounts', 'accounts', '/#accounts'],
    [
      '/settings?source=synthetic#categories',
      'categories',
      '/settings#categories',
    ],
    ['/?source=synthetic#unknown', 'dashboard', '/'],
    ['/settings?source=synthetic#unknown', 'settings', '/settings'],
  ]) {
    await page.goto(url!)
    await expect(page.locator(`.${owner}-page`)).toBeVisible()
    await expect(
      page.locator('.desktop-navigation [aria-current=page]'),
    ).toHaveAttribute('href', active!)
    const before = page.url()
    await page
      .getByRole('link', { name: 'Skip to content', exact: true })
      .focus()
    await page.keyboard.press('Enter')
    await expect(page.locator('#main-content')).toBeFocused()
    expect(page.url()).toBe(before)
    await expect(page.locator(`.${owner}-page`)).toBeVisible()
    await expect(
      page.locator('.desktop-navigation [aria-current=page]'),
    ).toHaveAttribute('href', active!)
  }
})
