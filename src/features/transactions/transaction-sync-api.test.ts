import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getTransactionSyncStatus,
  synchronizeTransactions,
} from './transaction-sync-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('transaction sync API', () => {
  it('loads persisted sync state through the same-origin API', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          syncStates: [
            {
              accountId: 'account-1',
              accountType: 'black',
              currencyCode: 'UAH',
              lastErrorCode: null,
              lastSuccessfulSyncAt: 3_000_000,
              status: 'idle',
            },
          ],
        },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    await expect(getTransactionSyncStatus()).resolves.toHaveLength(1)
    expect(fetcher).toHaveBeenCalledWith('/api/sync/transactions/status', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      method: 'GET',
    })
  })

  it('starts the manual sync step without receiving provider data', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: {
          sync: {
            accountId: 'account-1',
            importedCount: 1,
            skippedDuplicateCount: 0,
            status: 'synchronized',
            window: { fromEpochSeconds: 1_000, toEpochSeconds: 2_000 },
          },
        },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    await expect(synchronizeTransactions()).resolves.toMatchObject({
      accountId: 'account-1',
      importedCount: 1,
    })
    expect(fetcher).toHaveBeenCalledWith('/api/sync/transactions', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      method: 'POST',
    })
  })
})
