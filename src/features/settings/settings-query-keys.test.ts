import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import {
  refreshCurrencyAnalytics,
  settingsQueryKeys,
} from './settings-query-keys'

describe('currency analytics refresh', () => {
  it('invalidates financial analytics while retaining original ledger/account data and saved preferences', async () => {
    const client = new QueryClient()
    const analytics = ['dashboard-analytics', { baseCurrencyCode: 'EUR' }]
    client.setQueryData(analytics, { synthetic: true })
    client.setQueryData(settingsQueryKeys.currency, { baseCurrencyCode: 'EUR' })
    client.setQueryData(['accounts'], [])
    client.setQueryData(['transactions'], [])
    await refreshCurrencyAnalytics(client)
    expect(client.getQueryState(analytics)?.isInvalidated).toBe(true)
    expect(client.getQueryData(settingsQueryKeys.currency)).toEqual({
      baseCurrencyCode: 'EUR',
    })
    expect(client.getQueryState(['accounts'])?.isInvalidated).toBe(false)
    expect(client.getQueryState(['transactions'])?.isInvalidated).toBe(false)
    client.clear()
  })
})
