import { expect, test } from '@playwright/test'
import { installFinanceApiMock } from './fixtures/finance-api'

test('all five legacy destinations retain their layout in both themes and locales', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await installFinanceApiMock(page)
  await page.clock.install({ time: new Date('2025-01-15T12:00:00Z') })
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  for (const theme of ['light', 'dark']) {
    for (const locale of ['en', 'uk']) {
      await page.evaluate(
        ({ theme, locale }) => {
          localStorage.setItem('mono-finance-theme-v1', theme)
          localStorage.setItem('mono-finance-locale-v1', locale)
        },
        { theme, locale },
      )
      await page.reload()
      for (const width of [320, 375, 390, 430, 768, 1200, 1440]) {
        await page.setViewportSize({ width, height: 932 })
        for (const [url, owner] of [
          ['/', 'dashboard'],
          ['/transactions', 'transactions'],
          ['/settings#categories', 'categories'],
          ['/#accounts', 'accounts'],
          ['/settings', 'settings'],
        ]) {
          await page.goto(url!)
          await expect(page.locator(`.${owner}-page`)).toBeVisible()
          await expect(page.locator('.ui-skeleton')).toHaveCount(0)
          // Freeze animations so before/after screenshots describe layout only.
          if ((width === 390 || width === 1440) && locale === 'en') {
            await page.screenshot({
              path: `phase1.local/${process.env['PHASE1_CAPTURE'] ?? 'after'}/${owner}-${width}-${theme}.png`,
              fullPage: true,
              animations: 'disabled',
            })
          }
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true)
        }
      }
    }
  }
})
