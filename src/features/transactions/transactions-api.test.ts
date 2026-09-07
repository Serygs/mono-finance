import { afterEach, describe, expect, it, vi } from 'vitest'

import { getTransactions } from './transactions-api'

describe('getTransactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends only active filters and returns the transaction page', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ data: { nextCursor: null, transactions: [] } }),
          { status: 200 },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      getTransactions({
        accountIds: ['account-1', 'account-2'],
        category: 'Food',
        currency: 'UAH',
        dateFrom: 1_704_067_200,
        dateTo: null,
        direction: 'expense',
        excluded: false,
        search: 'market',
      }),
    ).resolves.toEqual({ nextCursor: null, transactions: [] })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions?accountId=account-1&accountId=account-2&dateFrom=1704067200&direction=expense&currency=UAH&category=Food&excluded=false&search=market',
      expect.objectContaining({ credentials: 'same-origin' }),
    )
  })
})
