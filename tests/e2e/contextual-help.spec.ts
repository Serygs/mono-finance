import { expect, test } from '@playwright/test'
import { installFinanceApiMock } from './fixtures/finance-api'

test.use({ hasTouch: true })

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
})

for (const [url, owner] of [
  ['/', 'dashboard'],
  ['/settings#categories', 'categories'],
  ['/#accounts', 'accounts'],
] as const) {
  test(`${owner} explanations close when the pointer leaves without a click`, async ({
    page,
  }) => {
    await page.goto(url)
    await expect(page.locator(`.${owner}-page`)).toBeVisible()
    await expect(page.locator('.ui-skeleton:visible')).toHaveCount(0)
    const triggers = page.locator(
      ':is(.ui-info-tooltip, .ui-label-help) > button:visible',
    )
    await expect(triggers.first()).toBeVisible()
    for (const trigger of await triggers.all()) {
      await trigger.hover()
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
      await expect(page.locator('.ui-help-description')).toBeVisible()
      await expect(page.locator('.ui-help-description')).not.toHaveText('')
      await page.mouse.move(0, 0)
      await expect(trigger).toHaveAttribute('aria-expanded', 'false')
      await expect(page.locator('.ui-help-description')).toHaveCount(0)
    }
  })
}

test('hover explanations remain readable over their content and cancel pending dismissal on re-entry', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Total spent', exact: true })
  const description = page.getByRole('dialog', {
    name: 'Total spent',
    exact: true,
  })
  await trigger.hover()
  await expect(description).toBeVisible()
  await description.hover()
  // Wait past the hover dismissal delay to check persistence, not just opening.
  await page.waitForTimeout(250)
  await expect(description).toBeVisible()
  await page.mouse.move(0, 0)
  await trigger.hover()
  await page.waitForTimeout(250)
  await expect(description).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(description).toHaveCount(0)
})

test('keyboard explanations persist until blur and Escape returns focus without reopening', async ({
  page,
}) => {
  const trigger = page.getByRole('button', { name: 'Total spent', exact: true })
  const description = page.getByRole('dialog', {
    name: 'Total spent',
    exact: true,
  })
  await trigger.focus()
  await expect(description).toBeVisible()
  await trigger.hover()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  await expect(description).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(description).toHaveCount(0)
  await trigger.focus()
  await expect(description).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(description).toHaveCount(0)
})

test('mobile tap explanations stay open after pointer movement and close on a second tap or outside click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const trigger = page.getByRole('button', { name: 'Total spent', exact: true })
  const description = page.getByRole('dialog', {
    name: 'Total spent',
    exact: true,
  })
  await trigger.tap()
  await expect(description).toBeVisible()
  await page.mouse.move(0, 0)
  await page.waitForTimeout(250)
  await expect(description).toBeVisible()
  await trigger.tap()
  await expect(description).toHaveCount(0)
  await trigger.tap()
  await expect(description).toBeVisible()
  await page.getByRole('heading', { name: 'Finance overview' }).tap()
  await expect(description).toHaveCount(0)
})

test('chart point details use the same hover dismissal behavior', async ({
  page,
}) => {
  const point = page
    .locator('.income-expense-plot .ui-chart-point button')
    .last()
  const details = page.locator('.ui-popover__content.ui-chart-point')
  await point.hover()
  await expect(details).toContainText('Net cash flow')
  await page.mouse.move(0, 0)
  await expect(details).toHaveCount(0)
})
