import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import {
  refreshCompensationDetails,
  refreshTransactionLedger,
} from '../transactions/transaction-queries'
import {
  refreshCategoryData,
  refreshCategorySourceMapping,
} from './category-queries'

describe('feature cache refresh policies', () => {
  it.each([
    [
      'category edits',
      refreshCategoryData,
      [
        'categories',
        'category-sources',
        'transactions',
        'dashboard-analytics',
        'dashboard-recent',
      ],
    ],
    [
      'source mappings',
      refreshCategorySourceMapping,
      [
        'category-sources',
        'transactions',
        'dashboard-analytics',
        'dashboard-recent',
      ],
    ],
    [
      'transaction corrections',
      refreshTransactionLedger,
      ['transactions', 'dashboard-recent', 'dashboard-analytics'],
    ],
  ] as const)(
    'retains the cache boundaries for %s',
    async (_name, refresh, invalidated) => {
      const client = new QueryClient()
      const keys = [
        'categories',
        'category-sources',
        'transactions',
        'dashboard-analytics',
        'dashboard-recent',
        'accounts',
        'currency-preferences',
      ]
      for (const key of keys)
        client.setQueryData([key, { filter: 'synthetic' }], [])
      client.setQueryData(
        ['dashboard-analytics', 'category-breakdowns', { filter: 'synthetic' }],
        {},
      )
      await refresh(client)
      for (const key of keys)
        expect(
          client.getQueryState([key, { filter: 'synthetic' }])?.isInvalidated,
        ).toBe(invalidated.some((value) => value === key))
      expect(
        client.getQueryState([
          'dashboard-analytics',
          'category-breakdowns',
          { filter: 'synthetic' },
        ])?.isInvalidated,
      ).toBe(true)
      client.clear()
    },
  )

  it('invalidates compensation details only for the selected expense', async () => {
    const client = new QueryClient()
    client.setQueryData(['compensations', 'expense-1'], {})
    client.setQueryData(['compensations', 'expense-2'], {})
    await refreshCompensationDetails(client, 'expense-1')
    expect(
      client.getQueryState(['compensations', 'expense-1'])?.isInvalidated,
    ).toBe(true)
    expect(
      client.getQueryState(['compensations', 'expense-2'])?.isInvalidated,
    ).toBe(false)
    client.clear()
  })
})
