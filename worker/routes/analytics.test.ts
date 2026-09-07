import { describe, expect, it } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import type { AnalyticsService } from '../services/analytics-service'

describe('analytics routes', () => {
  it('returns aggregate overview data for validated authenticated filters', async () => {
    const service = new FakeAnalyticsService()
    const app = createApp(
      () => authenticatedService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () => service as unknown as AnalyticsService,
    )
    const response = await app.request(
      '/api/analytics/overview?accountId=account-1&baseCurrency=UAH&dateFrom=1704067200&dateTo=1706745599',
      { headers: { Cookie: 'mono_finance_session=test' } },
      environment,
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(service.received).toEqual({
      accountIds: ['account-1'],
      baseCurrencyCode: 'UAH',
      dateFrom: 1_704_067_200,
      dateTo: 1_706_745_599,
      userId: 'owner-1',
    })
    await expect(response.json()).resolves.toEqual({ data: { totals: [] } })
  })
  it('rejects a missing or excessive analytics date range', async () => {
    const service = new FakeAnalyticsService()
    const app = createApp(
      () => authenticatedService,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      () => service as unknown as AnalyticsService,
    )
    const response = await app.request(
      '/api/analytics/trends?dateFrom=1704067200',
      { headers: { Cookie: 'mono_finance_session=test' } },
      environment,
    )
    expect(response.status).toBe(400)
    expect(service.received).toBeNull()
  })
})
const authenticatedService = {
  async requireSession() {
    return { email: 'owner@example.com', id: 'owner-1' }
  },
} as unknown as AuthService
const environment = {
  APP_ENV: 'development' as const,
  DB: {} as D1Database,
  MONOBANK_TOKEN: 'test-token',
  SESSION_TOKEN_PEPPER: 'test-pepper',
  SETUP_TOKEN: 'test-setup-token',
}
class FakeAnalyticsService {
  received: Record<string, unknown> | null = null
  async overview(filters: Record<string, unknown>) {
    this.received = filters
    return { totals: [] }
  }
  async breakdowns(filters: Record<string, unknown>) {
    this.received = filters
    return {}
  }
  async trends(filters: Record<string, unknown>) {
    this.received = filters
    return {}
  }
}
