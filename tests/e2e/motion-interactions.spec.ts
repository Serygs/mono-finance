import { expect, test, type Page } from '@playwright/test'
import { installFinanceApiMock } from './fixtures/finance-api'

async function signIn(page: Page) {
  // Install before Motion captures requestAnimationFrame during module loading.
  await page.clock.install()
  await installFinanceApiMock(page)
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('correct-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.dashboard-recent-card')).toBeVisible()
  await expect(page.locator('.ui-skeleton:visible')).toHaveCount(0)
}

async function freezeAnimations(page: Page) {
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
}

test('popover exits are immediately inert and rapid reopening preserves one interactive surface without refetching', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  const requests: string[] = []
  page.on('request', (request) => {
    if (/\/api\/(analytics\/|transactions\?)/.test(request.url()))
      requests.push(request.url())
  })
  await signIn(page)
  const before = requests.length
  const trigger = page.getByRole('button', { name: 'Filters', exact: true })
  await trigger.click()
  const panel = page
    .locator('.ui-popover__content')
    .filter({ has: page.locator('.dashboard-filter-options') })
  await expect(
    page.getByRole('dialog', { name: 'Filters', exact: true }),
  ).toBeVisible()
  await freezeAnimations(page)
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(trigger).toBeFocused()
  await expect(
    page.getByRole('dialog', { name: 'Filters', exact: true }),
  ).toHaveCount(0)
  const exiting = page.locator('.ui-popover__content[data-exiting]')
  await expect(exiting).toHaveAttribute('inert', '')
  await expect(exiting).toHaveAttribute('aria-hidden', 'true')
  await expect(exiting).toHaveCSS('pointer-events', 'none')
  for (let index = 0; index < 4; index++) {
    await trigger.evaluate((node) => node.click())
    await expect(
      page.getByRole('dialog', { name: 'Filters', exact: true }),
    ).toHaveCount(1)
    await page.keyboard.press('Escape')
  }
  await page.clock.runFor(300)
  await expect(panel).toHaveCount(0)
  await expect(exiting).toHaveCount(0)
  expect(requests).toHaveLength(before)
})

test('native modal closes before its exit finishes, restores focus and supports reopening during exit', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 932 })
  await signIn(page)
  const trigger = page.getByRole('button', {
    name: 'Overview actions',
    exact: true,
  })
  await trigger.click()
  await page
    .getByRole('button', { name: 'Customize dashboard', exact: true })
    .click()
  await expect(page.locator('dialog:modal')).toHaveCount(1)
  await freezeAnimations(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog:modal')).toHaveCount(0)
  const exiting = page.locator('dialog[data-exiting]')
  await expect(exiting).toHaveAttribute('inert', '')
  await expect(exiting).toHaveAttribute('aria-hidden', 'true')
  await expect(trigger).toBeFocused()
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
  await trigger.evaluate((node) => node.click())
  await page
    .getByRole('button', { name: 'Customize dashboard', exact: true })
    .evaluate((node) => node.click())
  await expect(page.locator('dialog:modal')).toHaveCount(1)
  await expect(page.locator('dialog')).toHaveCount(1)
  await expect(page.locator('dialog')).not.toHaveAttribute('inert', '')
  await page.keyboard.press('Tab')
  expect(
    await page.evaluate(
      () => !!document.activeElement?.closest('dialog:modal'),
    ),
  ).toBe(true)
  await page.keyboard.press('Escape')
  await page.clock.runFor(300)
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

test('multiselect exit removes checkbox interaction immediately and selection remains synchronous', async ({
  page,
}) => {
  await signIn(page)
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
  await page.reload()
  const trigger = page.locator('.ui-multi-select__trigger')
  await trigger.click()
  const checkbox = page.getByRole('checkbox').first()
  await expect(checkbox).toBeFocused()
  await checkbox.uncheck()
  await expect(checkbox).not.toBeChecked()
  await freezeAnimations(page)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await expect(page.getByRole('checkbox')).toHaveCount(0)
  await expect(page.locator('.ui-multi-select__menu')).toHaveAttribute(
    'inert',
    '',
  )
  await trigger.evaluate((node) => node.click())
  await expect(page.getByRole('checkbox').first()).toBeFocused()
  await expect(page.getByRole('checkbox').first()).not.toBeChecked()
  await page.keyboard.press('Escape')
  await page.clock.runFor(300)
  await expect(page.locator('.ui-multi-select__menu')).toHaveCount(0)
})

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  for (const locale of ['en', 'uk'] as const) {
    test(`sheets stay usable across portrait/landscape, themes and enlarged text: ${locale}, ${reducedMotion}`, async ({
      page,
    }, testInfo) => {
      await page.emulateMedia({ reducedMotion })
      await signIn(page)
      await page.evaluate(
        (locale) => localStorage.setItem('mono-finance-locale-v1', locale),
        locale,
      )
      await page.reload()
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          localStorage.setItem('mono-finance-theme-v1', theme)
          document.documentElement.dataset.theme = theme
        }, theme)
        for (const viewport of [
          { width: 390, height: 844 },
          { width: 667, height: 375 },
        ]) {
          await page.setViewportSize(viewport)
          const trigger = page
            .locator('.dashboard-toolbar')
            .getByRole('button', {
              name: locale === 'en' ? 'Filters' : 'Фільтри',
              exact: true,
            })
          await trigger.click()
          const dialog = page.locator('dialog:modal')
          await expect(dialog).toBeVisible()
          await page.addStyleTag({ content: 'html { font-size: 200%; }' })
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth <= window.innerWidth,
              ),
            )
            .toBe(true)
          const bounds = await dialog
            .locator('.ui-overlay__surface')
            .boundingBox()
          expect(bounds!.width).toBeLessThanOrEqual(viewport.width)
          await page.keyboard.press('Tab')
          expect(
            await page.evaluate(
              () => !!document.activeElement?.closest('dialog:modal'),
            ),
          ).toBe(true)
          await expect(dialog.locator('.ui-overlay__surface')).toHaveCSS(
            'transform',
            'none',
          )
          await expect(dialog.locator('.ui-overlay__surface')).toHaveCSS(
            'opacity',
            '1',
          )
          await page.screenshot({
            path: testInfo.outputPath(`${theme}-${viewport.width}.png`),
          })
          await page.keyboard.press('Escape')
          await expect(page.locator('dialog:modal')).toHaveCount(0)
          await expect(trigger).toBeFocused()
        }
      }
    })
  }
}

test('changing reduced motion while pressing stops spatial feedback and keeps selection immediate', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signIn(page)
  await page.goto('/transactions')
  const control = page.getByRole('button', { name: 'Expenses', exact: true })
  await expect(control).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await control.hover()
  await page.mouse.down()
  await expect(control).not.toHaveCSS('transform', 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(control).toHaveCSS('transform', 'none')
  await page.mouse.up()
  await expect(control).toHaveAttribute('aria-pressed', 'true')
  await control.focus()
  await page.keyboard.press('Enter')
  await expect(control).toHaveAttribute('aria-pressed', 'true')
  await expect(control).toHaveCSS('transform', 'none')
})

for (const width of [390, 1440]) {
  test(`changing reduced motion during overlay entry and exit settles immediately at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 932 })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await signIn(page)
    await freezeAnimations(page)
    const trigger = page.getByRole('button', { name: 'Filters', exact: true })
    await trigger.focus()
    await trigger.evaluate((node) => node.click())
    const surface = page.locator(
      width < 768 ? '.ui-overlay__surface' : '.ui-popover__content',
    )
    await page.clock.runFor(50)
    await expect(surface).not.toHaveCSS('transform', 'none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(surface).toHaveCSS('transform', 'none')
    await expect(surface).toHaveCSS('opacity', '1')
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.keyboard.press('Escape')
    await page.clock.runFor(32)
    await expect(surface).not.toHaveCSS('transform', 'none')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('[data-exiting]')).toHaveCount(0)
    await expect(surface).toHaveCount(0)
    await expect(trigger).toBeFocused()
    // Re-enable motion, then prove a completed old exit cannot remove a reopened overlay.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await trigger.evaluate((node) => node.click())
    await page.clock.runFor(300)
    await expect(surface).toHaveCSS('opacity', '1')
    await expect(surface).toHaveCSS('transform', 'none')
    await page.keyboard.press('Escape')
    await page.clock.runFor(300)
    await expect(surface).toHaveCount(0)
  })
}

test('expired session removes an open sheet immediately and releases scroll locking', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await signIn(page)
  await page
    .getByRole('button', { name: 'Overview actions', exact: true })
    .click()
  await page.getByRole('button', { name: 'Sync status', exact: true }).click()
  await expect(page.locator('dialog:modal')).toBeVisible()
  await page.route('**/api/sync/accounts', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'unauthenticated', message: 'Unauthorized' } },
    }),
  )
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await expect(page.locator('dialog, .ui-popover__content')).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden')
})
