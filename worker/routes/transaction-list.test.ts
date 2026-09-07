import { describe, expect, it } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import type { AccountService } from '../services/account-service'
import type { TransactionQueryService } from '../services/transaction-query-service'
import type { TransactionSyncService } from '../services/transaction-sync-service'

describe('transaction list route', () => {
  it('returns a paginated, filtered transaction view for the authenticated owner', async () => {
    const service = new FakeTransactionQueryService()
    const cursor = btoa(
      JSON.stringify({ id: 'transaction-1', timestamp: 1_704_000_000 }),
    )
    const app = createApp(
      () => authenticatedService,
      () => ({}) as AccountService,
      () => ({}) as TransactionSyncService,
      () => service as unknown as TransactionQueryService,
    )

    const response = await app.request(
      `/api/transactions?accountId=account-1&accountId=account-2&dateFrom=1704067200&dateTo=1706745599&direction=expense&currency=UAH&category=Food&excluded=false&search=market&limit=25&cursor=${encodeURIComponent(cursor)}`,
      { headers: { Cookie: 'mono_finance_session=test-session' } },
      environment,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({ data: service.result })
    expect(service.received).toEqual({
      accountIds: ['account-1', 'account-2'],
      category: 'Food',
      cursor,
      dateFrom: 1_704_067_200,
      dateTo: 1_706_745_599,
      direction: 'expense',
      excluded: false,
      limit: 25,
      search: 'market',
      userId: 'owner-1',
      currency: 'UAH',
    })
  })

  it('rejects invalid transaction filters without querying data', async () => {
    const service = new FakeTransactionQueryService()
    const app = createApp(
      () => authenticatedService,
      () => ({}) as AccountService,
      () => ({}) as TransactionSyncService,
      () => service as unknown as TransactionQueryService,
    )

    const response = await app.request(
      '/api/transactions?direction=sideways',
      { headers: { Cookie: 'mono_finance_session=test-session' } },
      environment,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Invalid transaction filters.',
      },
    })
    expect(service.received).toBeNull()
  })

  it('rejects a malformed cursor without querying data', async () => {
    const service = new FakeTransactionQueryService()
    const app = createApp(
      () => authenticatedService,
      () => ({}) as AccountService,
      () => ({}) as TransactionSyncService,
      () => service as unknown as TransactionQueryService,
    )

    const response = await app.request(
      '/api/transactions?cursor=invalid',
      {
        headers: { Cookie: 'mono_finance_session=test-session' },
      },
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

class FakeTransactionQueryService {
  received: Record<string, unknown> | null = null
  readonly result = {
    nextCursor: null,
    transactions: [],
  }

  async list(input: Record<string, unknown>) {
    this.received = input
    return this.result
  }
}
