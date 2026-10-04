import { expect, test, type Page } from '@playwright/test'

async function prepareCache(page: Page, clear = true) {
  // Load the cache module without AuthProvider: unrelated session verification
  // must not broadcast a session end while two synthetic cache clients race.
  await page.route('**/__test/cache-harness', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body></body></html>',
    }),
  )
  await page.goto('/__test/cache-harness')
  await page.evaluate(async (clear) => {
    const sessionPath = '/src/features/auth/private-session.ts'
    const cachePath = '/src/features/offline/encrypted-offline-cache.ts'
    const session = (await import(
      sessionPath
    )) as typeof import('../../src/features/auth/private-session')
    const cache = (await import(
      cachePath
    )) as typeof import('../../src/features/offline/encrypted-offline-cache')
    session.activatePrivateSession(4_102_444_800)
    if (clear) await cache.clearOfflineCache()
  }, clear)
}

test('slow WebCrypto completes outside native IndexedDB transactions and round-trips', async ({
  page,
}) => {
  await prepareCache(page)
  const result = await page.evaluate(async () => {
    const path = '/src/features/offline/encrypted-offline-cache.ts'
    const cache = (await import(
      path
    )) as typeof import('../../src/features/offline/encrypted-offline-cache')
    const generate = crypto.subtle.generateKey.bind(crypto.subtle)
    const transaction = IDBDatabase.prototype.transaction
    let generating = false
    let transactionsDuringGeneration = 0
    Object.defineProperty(crypto.subtle, 'generateKey', {
      configurable: true,
      value: async () => {
        generating = true
        await new Promise((resolve) => setTimeout(resolve, 150))
        const key = await generate({ name: 'AES-GCM', length: 256 }, false, [
          'encrypt',
          'decrypt',
        ])
        generating = false
        return key
      },
    })
    IDBDatabase.prototype.transaction = function (...args) {
      if (generating) transactionsDuringGeneration++
      return transaction.apply(this, args)
    }
    try {
      await cache.cacheOfflineData('/api/synthetic/slow', {
        amountMinor: -4000,
        note: 'Synthetic sensitive note',
      })
      return {
        transactionsDuringGeneration,
        entry: await cache.readOfflineData('/api/synthetic/slow'),
      }
    } finally {
      IDBDatabase.prototype.transaction = transaction
      delete (crypto.subtle as unknown as Record<string, unknown>)[
        'generateKey'
      ]
    }
  })
  expect(result.transactionsDuringGeneration).toBe(0)
  expect(result.entry?.value).toEqual({
    amountMinor: -4000,
    note: 'Synthetic sensitive note',
  })
})

test('parallel cold starts in different tabs encrypt with the one committed key', async ({
  page,
  context,
}) => {
  await prepareCache(page)
  const other = await context.newPage()
  await prepareCache(other, false)
  const tabs = [page, other]
  for (const tab of tabs) {
    await tab.evaluate(() => {
      const state = window as unknown as {
        generationCalls: number
        finishGeneration(): void
      }
      state.generationCalls = 0
      const gate = new Promise<void>((resolve) => {
        state.finishGeneration = resolve
      })
      const generate = crypto.subtle.generateKey.bind(crypto.subtle)
      Object.defineProperty(crypto.subtle, 'generateKey', {
        configurable: true,
        value: async () => {
          state.generationCalls++
          await gate
          return generate({ name: 'AES-GCM', length: 256 }, false, [
            'encrypt',
            'decrypt',
          ])
        },
      })
    })
  }
  const writes = tabs.map((tab, index) =>
    tab.evaluate(async (index) => {
      const path = '/src/features/offline/encrypted-offline-cache.ts'
      const cache = (await import(
        path
      )) as typeof import('../../src/features/offline/encrypted-offline-cache')
      await cache.cacheOfflineData(`/api/synthetic/parallel-${index}`, {
        amountMinor: -100 - index,
      })
    }, index),
  )
  for (const tab of tabs) {
    await expect
      .poll(() =>
        tab.evaluate(
          () =>
            (window as unknown as { generationCalls: number }).generationCalls,
        ),
      )
      .toBe(1)
  }
  await Promise.all(
    tabs.map((tab) =>
      tab.evaluate(() =>
        (window as unknown as { finishGeneration(): void }).finishGeneration(),
      ),
    ),
  )
  await Promise.all(writes)
  for (const tab of tabs) {
    const values = await tab.evaluate(async () => {
      const path = '/src/features/offline/encrypted-offline-cache.ts'
      const cache = (await import(
        path
      )) as typeof import('../../src/features/offline/encrypted-offline-cache')
      return Promise.all(
        [0, 1].map(
          async (index) =>
            (await cache.readOfflineData(`/api/synthetic/parallel-${index}`))
              ?.value,
        ),
      )
    })
    expect(values).toEqual([{ amountMinor: -100 }, { amountMinor: -101 }])
  }
  // A new module instance must recover the persisted key, not an in-memory candidate.
  await other.reload()
  await prepareCache(other, false)
  expect(
    await other.evaluate(async () => {
      const path = '/src/features/offline/encrypted-offline-cache.ts'
      const cache = (await import(
        path
      )) as typeof import('../../src/features/offline/encrypted-offline-cache')
      return (await cache.readOfflineData('/api/synthetic/parallel-0'))?.value
    }),
  ).toEqual({ amountMinor: -100 })
  const stored = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('mono-finance-offline-v1', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      const keys = await new Promise<CryptoKey[]>((resolve, reject) => {
        const request = database
          .transaction('keys')
          .objectStore('keys')
          .getAll()
        request.onsuccess = () => resolve(request.result as CryptoKey[])
        request.onerror = () => reject(request.error)
      })
      return { count: keys.length, extractable: keys[0]?.extractable }
    } finally {
      database.close()
    }
  })
  expect(stored).toEqual({ count: 1, extractable: false })
})

for (const failure of ['crypto', 'transaction'] as const) {
  test(`cache recovers after a ${failure} error without using an uncommitted key`, async ({
    page,
  }) => {
    await prepareCache(page)
    const result = await page.evaluate(async (failure) => {
      const path = '/src/features/offline/encrypted-offline-cache.ts'
      const cache = (await import(
        path
      )) as typeof import('../../src/features/offline/encrypted-offline-cache')
      const generate = crypto.subtle.generateKey.bind(crypto.subtle)
      const put = IDBObjectStore.prototype.put
      let fail = true
      Object.defineProperty(crypto.subtle, 'generateKey', {
        configurable: true,
        value: async () => {
          if (failure === 'crypto' && fail) {
            fail = false
            throw new DOMException('Synthetic crypto failure', 'OperationError')
          }
          return generate({ name: 'AES-GCM', length: 256 }, false, [
            'encrypt',
            'decrypt',
          ])
        },
      })
      IDBObjectStore.prototype.put = function (...args) {
        const request = put.apply(this, args)
        if (failure === 'transaction' && fail && this.name === 'keys') {
          fail = false
          this.transaction.abort()
        }
        return request
      }
      try {
        let rejected = false
        try {
          await cache.cacheOfflineData('/api/synthetic/failure', {
            amountMinor: -1,
          })
        } catch {
          rejected = true
        }
        const failedEntry = await cache.readOfflineData(
          '/api/synthetic/failure',
        )
        await cache.cacheOfflineData('/api/synthetic/recovered', {
          amountMinor: -200,
        })
        return {
          rejected,
          failedEntry,
          entry: await cache.readOfflineData('/api/synthetic/recovered'),
        }
      } finally {
        IDBObjectStore.prototype.put = put
        delete (crypto.subtle as unknown as Record<string, unknown>)[
          'generateKey'
        ]
      }
    }, failure)
    expect(result.rejected).toBe(true)
    expect(result.failedEntry).toBeNull()
    expect(result.entry?.value).toEqual({ amountMinor: -200 })
  })
}
