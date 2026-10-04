import { expect, test, type Page } from '@playwright/test'
import { installFinanceApiMock } from './fixtures/finance-api'

const session = {
  expiresAt: 4_102_444_800,
  user: { id: 'owner', email: 'owner@example.com' },
}

async function authenticatedPage(page: Page) {
  await installFinanceApiMock(page)
  await page.route('**/api/auth/**', async (route) => {
    await route.fulfill({
      json: {
        data: route.request().url().endsWith('/logout')
          ? { loggedOut: true }
          : session,
      },
    })
  })
  await page.goto('/settings')
  await expect(page.locator('.settings-page')).toBeVisible()
}

test('logout clears private screens and encrypted cache access across two tabs', async ({
  page,
  context,
}) => {
  let accountReads = 0
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/accounts') accountReads++
  })
  await authenticatedPage(page)
  const other = await context.newPage()
  await authenticatedPage(other)
  await other.evaluate(async () => {
    const path = '/src/features/offline/encrypted-offline-cache.ts'
    const cache = (await import(
      path
    )) as typeof import('../../src/features/offline/encrypted-offline-cache')
    await cache.cacheOfflineData('/api/synthetic', { amountMinor: -100 })
    const entry = await cache.readOfflineData<{ amountMinor: number }>(
      '/api/synthetic',
    )
    if (entry?.value.amountMinor !== -100)
      throw new Error('Cache did not round-trip')
  })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  for (const tab of [page, other]) {
    await expect(
      tab.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible()
    await expect(tab.locator('.app-shell')).toHaveCount(0)
    expect(
      await tab.evaluate(async () => {
        const path = '/src/features/offline/encrypted-offline-cache.ts'
        const cache = (await import(
          path
        )) as typeof import('../../src/features/offline/encrypted-offline-cache')
        try {
          await cache.readOfflineData('/api/synthetic')
          return false
        } catch {
          return true
        }
      }),
    ).toBe(true)
  }
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await indexedDB.databases()).map((db) => db.name),
      ),
    )
    .not.toContain('mono-finance-offline-v1')
  // The fixture still reports a session. A persisted logout must prevent reopening it.
  await other.reload()
  await expect(
    other.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  const readsBeforeLogin = accountReads
  await page.getByLabel('Email').fill('owner@example.com')
  await page.getByLabel('Password').fill('synthetic-password')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.locator('.app-shell')).toBeVisible()
  await expect.poll(() => accountReads).toBeGreaterThan(readsBeforeLogin)
})

test('a blocked IndexedDB deletion locks login and exposes a retry that recovers', async ({
  page,
}) => {
  await authenticatedPage(page)
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('mono-finance-offline-v1', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('encrypted-records', {
          keyPath: 'key',
        })
        request.result.createObjectStore('keys')
      }
      request.onerror = () => reject(new Error('Synthetic blocker failed'))
      request.onsuccess = () => {
        // Simulates a stale tab that does not close its connection on versionchange.
        ;(window as unknown as { closeBlocker(): void }).closeBlocker = () =>
          request.result.close()
        resolve()
      }
    })
  })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Local data cleanup failed',
  )
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeDisabled()
  await page.evaluate(() =>
    (window as unknown as { closeBlocker(): void }).closeBlocker(),
  )
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (await indexedDB.databases()).map((db) => db.name),
      ),
    )
    .not.toContain('mono-finance-offline-v1')
  await page.getByRole('button', { name: 'Retry local cleanup' }).click()
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeEnabled()
})

test('an unavailable cache deletion has distinct safe recovery and prevents sign-in', async ({
  page,
}) => {
  await authenticatedPage(page)
  await page.evaluate(() => {
    const original = indexedDB.deleteDatabase.bind(indexedDB)
    Object.defineProperty(indexedDB, 'deleteDatabase', {
      configurable: true,
      value() {
        throw new DOMException(
          'Synthetic private failure details',
          'SecurityError',
        )
      },
    })
    ;(
      window as unknown as { restoreCacheDeletion(): void }
    ).restoreCacheDeletion = () => {
      Object.defineProperty(indexedDB, 'deleteDatabase', {
        configurable: true,
        value: original,
      })
    }
  })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Check browser storage permissions',
  )
  await expect(page.getByRole('alert')).not.toContainText(
    'Synthetic private failure details',
  )
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeDisabled()
  await page.evaluate(() =>
    (
      window as unknown as { restoreCacheDeletion(): void }
    ).restoreCacheDeletion(),
  )
  await page.getByRole('button', { name: 'Retry local cleanup' }).click()
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeEnabled()
})

for (const unavailable of ['BroadcastChannel', 'localStorage'] as const) {
  test(`cross-tab logout works with ${unavailable} unavailable`, async ({
    page,
    context,
  }) => {
    await context.addInitScript((name) => {
      Object.defineProperty(window, name, {
        get() {
          throw new DOMException(
            'Synthetic unavailable browser feature',
            'SecurityError',
          )
        },
      })
    }, unavailable)
    await authenticatedPage(page)
    const other = await context.newPage()
    await authenticatedPage(other)
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await expect(
      other.getByRole('button', { name: 'Sign in', exact: true }),
    ).toBeVisible()
    await expect(other.locator('.app-shell')).toHaveCount(0)
  })
}

test('a session verification response arriving after another tab logs out cannot reopen private UI', async ({
  page,
  context,
}) => {
  await authenticatedPage(page)
  const other = await context.newPage()
  await installFinanceApiMock(other)
  let release!: () => void
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  let started!: () => void
  const requestStarted = new Promise<void>((resolve) => {
    started = resolve
  })
  await other.route('**/api/auth/session', async (route) => {
    started()
    await held
    await route.fulfill({ json: { data: session } })
  })
  await other.goto('/settings')
  await requestStarted
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(
    other.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  const completed = other.waitForResponse('**/api/auth/session')
  release()
  await completed
  await expect(other.locator('.app-shell')).toHaveCount(0)
  await expect(
    other.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
})

test('storage access and write failures retain an immediately switchable locale', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Synthetic unavailable storage', 'SecurityError')
      },
    })
  })
  await installFinanceApiMock(page)
  await page.goto('/login')
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await page.getByLabel('Language', { exact: true }).selectOption('uk')
  await expect(
    page.getByRole('button', { name: 'Увійти', exact: true }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await page.getByLabel('Мова', { exact: true }).selectOption('en')
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
})

for (const failure of [429, 503, 'offline'] as const) {
  test(`temporary verification failure ${failure} locks private data and can be retried`, async ({
    page,
  }) => {
    await installFinanceApiMock(page)
    let failed = true
    await page.route('**/api/auth/session', async (route) => {
      if (!failed)
        return void (await route.fulfill({ json: { data: session } }))
      if (failure === 'offline')
        return void (await route.abort('internetdisconnected'))
      await route.fulfill({ status: failure, body: 'Synthetic server details' })
    })
    await page.goto('/settings')
    await expect(
      page.getByRole('button', { name: 'Retry session verification' }),
    ).toBeVisible()
    await expect(page.locator('.app-shell')).toHaveCount(0)
    await expect(page.getByRole('alert')).not.toContainText(
      'Synthetic server details',
    )
    failed = false
    await page
      .getByRole('button', { name: 'Retry session verification' })
      .click()
    await expect(page.locator('.settings-page')).toBeVisible()
  })
}

test('a confirmed private API 401 tears down both tabs', async ({
  page,
  context,
}) => {
  await authenticatedPage(page)
  const other = await context.newPage()
  await authenticatedPage(other)
  await page.route('**/api/sync/accounts', (route) =>
    route.fulfill({
      status: 401,
      json: { error: { code: 'unauthenticated', message: 'Unauthorized' } },
    }),
  )
  await page
    .getByRole('link', { name: 'Accounts', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: 'Sync accounts', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
  await expect(
    other.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible()
})

test('a render error shows localized recovery without private error details', async ({
  page,
}) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  await page.route(/\/src\/features\/auth\/LoginPage\.tsx(?:\?.*)?$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'export function LoginPage() { throw new Error("Synthetic private details") }',
    }),
  )
  await installFinanceApiMock(page)
  await page.goto('/login')
  await expect(
    page.getByRole('button', { name: 'Reload application' }),
  ).toBeVisible()
  await expect(page.locator('main')).not.toContainText(
    'Synthetic private details',
  )
  expect(consoleErrors.join(' ')).not.toContain('Synthetic private details')
  await page.getByLabel('Language', { exact: true }).selectOption('uk')
  await expect(
    page.getByRole('button', { name: 'Перезавантажити застосунок' }),
  ).toBeVisible()
})

test('recovery uses accessible controls in both locales and themes without overflow', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 503, body: 'Synthetic failure' }),
  )
  await page.goto('/login')
  for (const theme of ['light', 'dark']) {
    await page.evaluate(
      (selected) => (document.documentElement.dataset['theme'] = selected),
      theme,
    )
    for (const locale of ['en', 'uk']) {
      await page.locator('select[name="language"]').selectOption(locale)
      for (const width of [1440, 1200, 768, 430, 390, 375, 320]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 932 })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true)
        await expect(page.getByRole('alert')).toBeVisible()
        await expect(page.locator('main .ui-button')).toBeVisible()
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: `test-results/session-recovery-${theme}-${locale}-${width}.png`,
          })
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.locator('select[name="language"]').focus()
  await page.keyboard.press('Tab')
  await expect(page.locator('main .ui-button')).toBeFocused()
})

for (const failure of [401, 429, 503, 'offline'] as const) {
  test(`login failure ${failure} shows a specific safe error and supports resubmission`, async ({
    page,
  }) => {
    await installFinanceApiMock(page)
    let failed = true
    await page.route('**/api/auth/login', async (route) => {
      if (!failed)
        return void (await route.fulfill({ json: { data: session } }))
      if (failure === 'offline')
        return void (await route.abort('internetdisconnected'))
      await route.fulfill({
        status: failure,
        body: 'Synthetic private failure details',
      })
    })
    await page.goto('/login')
    await page.getByLabel('Email').fill('owner@example.com')
    await page.getByLabel('Password').fill('synthetic-password')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    const message =
      failure === 401
        ? 'The email or password is not recognised.'
        : failure === 429
          ? 'Too many authentication attempts. Wait before trying again.'
          : failure === 'offline'
            ? 'Unable to connect. Check your connection and try again.'
            : 'Authentication is temporarily unavailable. Try again later.'
    await expect(page.getByRole('alert')).toHaveText(message)
    await expect(page.getByLabel('Password')).toHaveValue('synthetic-password')
    if (failure === 401) {
      await expect(page.getByLabel('Email')).toBeFocused()
      await expect(page.getByLabel('Password')).toHaveAttribute(
        'aria-invalid',
        'true',
      )
    }
    failed = false
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.locator('.app-shell')).toBeVisible()
  })
}
