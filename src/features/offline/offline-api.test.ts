import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('./encrypted-offline-cache', () => ({
  cacheOfflineData: vi.fn(),
  readOfflineData: vi.fn(),
}))

import { cacheOfflineData, readOfflineData } from './encrypted-offline-cache'
import { getOfflineApiData } from './offline-api'

describe('getOfflineApiData', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('writes a successful D1 response to the encrypted local cache', async () => {
    const value = { transactions: [{ id: 'transaction-1' }] }

    await expect(
      getOfflineApiData('/api/transactions?limit=50', async () => value),
    ).resolves.toEqual(value)

    expect(cacheOfflineData).toHaveBeenCalledWith(
      '/api/transactions?limit=50',
      value,
    )
  })

  it('uses an existing encrypted snapshot only after a network failure', async () => {
    const cachedValue = { transactions: [{ id: 'transaction-1' }] }
    vi.mocked(readOfflineData).mockResolvedValue({
      cachedAt: 1_704_067_200_000,
      value: cachedValue,
    })

    await expect(
      getOfflineApiData('/api/transactions?limit=50', async () => {
        throw new TypeError('Failed to fetch')
      }),
    ).resolves.toEqual(cachedValue)
  })

  it('does not replace an authorization failure with stale cache data', async () => {
    await expect(
      getOfflineApiData('/api/transactions?limit=50', async () => {
        throw new Error('Unauthorized')
      }),
    ).rejects.toThrow('Unauthorized')

    expect(readOfflineData).not.toHaveBeenCalled()
  })
})
