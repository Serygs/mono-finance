import { afterEach, describe, expect, it, vi } from 'vitest'

import { getAccounts, synchronizeAccounts } from './accounts-api'

describe('accounts API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the authenticated safe account contract', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          accounts: [
            {
              balanceMinor: 10_000,
              cards: [],
              creditLimitMinor: 0,
              currency: {
                code: 'EUR',
                displayName: 'Euro',
                minorUnit: 2,
                numericCode: '978',
              },
              id: 'account-1',
              isActive: true,
              type: 'white',
            },
          ],
        },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    const accounts = await getAccounts()

    expect(accounts).toHaveLength(1)
    expect(fetcher).toHaveBeenCalledWith('/api/accounts', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      method: 'GET',
    })
  })

  it('requests synchronization with same-origin credentials', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json({ data: { accounts: [] } }))
    vi.stubGlobal('fetch', fetcher)

    await synchronizeAccounts()

    expect(fetcher).toHaveBeenCalledWith('/api/sync/accounts', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      method: 'POST',
    })
  })

  it('uses the safe API error message when synchronization fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: {
              code: 'sync_rate_limited',
              message: 'Account sync is temporarily rate limited.',
            },
          },
          { status: 429 },
        ),
      ),
    )

    await expect(synchronizeAccounts()).rejects.toThrow(
      'Account sync is temporarily rate limited.',
    )
  })
})
