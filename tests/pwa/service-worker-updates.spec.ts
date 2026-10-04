import {
  expect,
  test,
  type Page,
  type APIRequestContext,
} from '@playwright/test'
import { installFinanceApiMock } from '../e2e/fixtures/finance-api'

async function prepareApp(page: Page, path = '/transactions') {
  await installFinanceApiMock(page)
  await page.route('**/api/auth/**', (route) =>
    route.fulfill({
      json: {
        data: {
          expiresAt: 4_102_444_800,
          user: { id: 'owner', email: 'owner@example.com' },
        },
      },
    }),
  )
  await page.goto(path)
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state))
    .toBe('activated')
  await expect(page.locator('.service-worker-update')).toHaveCount(0)
  // Open the built application with an existing controller, as an installed PWA does.
  await page.reload()
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect(page.locator('.service-worker-update')).toHaveCount(0)
}

async function offerUpdate(page: Page, request: APIRequestContext) {
  await request.post('/__test/worker-version')
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.ready).update()
  })
  await expect(page.locator('.service-worker-update')).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.ready).waiting?.state,
      ),
    )
    .toBe('installed')
}

function countNavigations(page: Page) {
  let count = 0
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      count++
  })
  return () => count
}

async function editTransaction(page: Page) {
  await page.getByRole('button', { name: /Restaurant/ }).click()
  await page
    .getByRole('button', { name: 'Analytics adjustment', exact: true })
    .click()
  await page.getByLabel('Note').fill('Synthetic private draft')
}

test('a real worker update and failed save preserve an editing draft until explicitly closed', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await prepareApp(page)
  const navigations = countNavigations(page)
  await editTransaction(page)
  await offerUpdate(page, request)
  await expect(page.getByLabel('Note')).toHaveValue('Synthetic private draft')
  await expect(page.getByLabel('Note')).toBeFocused()
  await expect(page.locator('.service-worker-update button')).toBeDisabled()
  await page.route('**/api/transactions/expense-1/adjustment', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: { code: 'unavailable', message: 'Synthetic save failure' },
      },
    }),
  )
  await page
    .getByRole('button', { name: 'Save adjustment', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Transaction correction could not be saved.',
  )
  await expect(page.getByLabel('Note')).toHaveValue('Synthetic private draft')
  await expect(page.locator('.service-worker-update button')).toBeDisabled()
  expect(navigations()).toBe(0)
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain('Synthetic private draft')
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Update and reload' }),
  ).toBeEnabled()
  expect(navigations()).toBe(0)
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Update and reload' }).click(),
  ])
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(navigations()).toBe(1)
})

test('activation in another tab does not reload an editor or bypass local consent', async ({
  page,
  context,
  request,
}) => {
  await prepareApp(page)
  const other = await context.newPage()
  await prepareApp(other)
  await editTransaction(page)
  const navigations = countNavigations(page)
  await offerUpdate(other, request)
  await Promise.all([
    other.waitForEvent('load'),
    other.getByRole('button', { name: 'Update and reload' }).click(),
  ])
  await expect(page.locator('.service-worker-update')).toContainText(
    'Finish or cancel editing',
  )
  await expect(page.getByLabel('Note')).toHaveValue('Synthetic private draft')
  expect(navigations()).toBe(0)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Update and reload' }),
  ).toBeEnabled()
  expect(navigations()).toBe(0)
  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Update and reload' }).click(),
  ])
  expect(navigations()).toBe(1)
})

test('an accepted update waits for a pending mutation and then reloads once', async ({
  page,
  request,
}) => {
  await prepareApp(page, '/#accounts')
  let complete!: () => void
  const pending = new Promise<void>((resolve) => {
    complete = resolve
  })
  let started = false
  await page.route('**/api/sync/accounts', async (route) => {
    started = true
    await pending
    await route.fulfill({ json: { data: { accounts: [] } } })
  })
  const navigations = countNavigations(page)
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).click()
  await expect.poll(() => started).toBe(true)
  await offerUpdate(page, request)
  await page.getByRole('button', { name: 'Update and reload' }).click()
  await expect(page.locator('.service-worker-update')).toContainText(
    'Waiting for pending changes',
  )
  expect(navigations()).toBe(0)
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.ready).waiting?.state,
      ),
    )
    .toBe('installed')
  const loaded = page.waitForEvent('load')
  complete()
  await loaded
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(navigations()).toBe(1)
})

test('category merge and currency drafts block real updates until dismissed', async ({
  page,
  request,
}) => {
  await prepareApp(page, '/settings#categories')
  await page.route('**/api/categories', (route) =>
    route.fulfill({
      json: {
        data: {
          categories: [
            {
              id: 'category-dining',
              name: 'Dining',
              colorToken: 'orange',
              icon: 'fork',
            },
            {
              id: 'category-savings',
              name: 'Savings',
              colorToken: 'green',
              icon: 'wallet',
            },
          ],
        },
      },
    }),
  )
  await page.reload()
  await page.getByRole('link', { name: 'Manage', exact: true }).click()
  await page
    .locator('.category-list-actions--direct')
    .getByRole('button', { name: 'Merge', exact: true })
    .first()
    .click()
  await page.getByLabel('Merge into').selectOption('category-savings')
  const navigations = countNavigations(page)
  await offerUpdate(page, request)
  await expect(page.getByLabel('Merge into')).toHaveValue('category-savings')
  await expect(page.locator('.service-worker-update button')).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(page.locator('.service-worker-update button')).toBeEnabled()
  await page.getByRole('link', { name: 'More', exact: true }).click()
  await page.getByRole('button', { name: 'Base currency', exact: true }).click()
  await page.getByLabel('Base currency (ISO 4217)').fill('USD')
  await expect(page.locator('.service-worker-update button')).toBeDisabled()
  await expect(page.getByLabel('Base currency (ISO 4217)')).toHaveValue('USD')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.locator('.service-worker-update button')).toBeEnabled()
  expect(navigations()).toBe(0)
})

test('a downloaded update preserves the verified session while offline', async ({
  page,
  context,
  request,
}) => {
  await prepareApp(page)
  await offerUpdate(page, request)
  const navigations = countNavigations(page)
  await context.setOffline(true)
  await expect(page.locator('.service-worker-update')).toContainText(
    'Connect to the internet before updating',
  )
  await expect(page.locator('.service-worker-update button')).toBeDisabled()
  expect(navigations()).toBe(0)
  await expect(page.locator('.app-shell')).toBeVisible()
  await context.setOffline(false)
  await expect(page.locator('.service-worker-update button')).toBeEnabled()
  expect(navigations()).toBe(0)
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('.service-worker-update button').click(),
  ])
  await expect(page.locator('.app-shell')).toBeVisible()
  expect(navigations()).toBe(1)
})

for (const scenario of [
  { width: 1440, theme: 'light', locale: 'en' },
  { width: 390, theme: 'dark', locale: 'uk' },
  { width: 320, theme: 'light', locale: 'uk' },
] as const) {
  test(`idle update is accessible at ${scenario.width}px in ${scenario.theme}/${scenario.locale}`, async ({
    page,
    request,
  }, testInfo) => {
    await page.setViewportSize({ width: scenario.width, height: 900 })
    await page.addInitScript((scenario) => {
      localStorage.setItem('mono-finance-locale-v1', scenario.locale)
      localStorage.setItem('mono-finance-theme-v1', scenario.theme)
    }, scenario)
    await prepareApp(page)
    const navigations = countNavigations(page)
    await offerUpdate(page, request)
    const notice = page.locator('.service-worker-update')
    await expect(notice).toHaveAttribute('role', 'status')
    await expect(notice).toContainText(
      scenario.locale === 'en'
        ? 'App update available'
        : 'Доступне оновлення застосунку',
    )
    await expect(notice.locator('button')).toBeEnabled()
    expect(navigations()).toBe(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: testInfo.outputPath('update-notice.png'),
      fullPage: true,
    })
    // Locale switching updates the prompt immediately, without reinstalling the worker.
    if (scenario.width >= 768) {
      await page.locator('select[name="language"]').selectOption('uk')
    } else {
      await page
        .locator('.mobile-navigation')
        .getByRole('link', { name: 'Ще', exact: true })
        .click()
      await page.getByRole('button', { name: 'Мова', exact: true }).click()
      await page
        .getByRole('button', { name: 'Англійська', exact: true })
        .click()
    }
    await expect(notice).toContainText(
      scenario.locale === 'en'
        ? 'Доступне оновлення застосунку'
        : 'App update available',
    )
    await notice.locator('button').focus()
    await expect(notice.locator('button')).toBeFocused()
    await Promise.all([page.waitForEvent('load'), page.keyboard.press('Enter')])
    await expect(page.locator('.app-shell')).toBeVisible()
    expect(navigations()).toBe(1)
    const cachedPaths = await page.evaluate(async () => {
      const requests = await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await caches.open(key)).keys(),
        ),
      )
      return requests.flat().map((request) => new URL(request.url).pathname)
    })
    expect(cachedPaths.some((path) => path.startsWith('/api/'))).toBe(false)
  })
}
