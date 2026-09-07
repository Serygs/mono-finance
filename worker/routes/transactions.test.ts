import { describe, expect, it } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import { MonobankApiError } from '../monobank/errors'
import type { AccountService } from '../services/account-service'
import type { TransactionSyncService } from '../services/transaction-sync-service'

describe('transaction synchronization routes', () => {
  it('returns persisted sync status without invoking Monobank', async () => {
    const service = new FakeTransactionSyncService()
    const response = await authenticatedRequest(
      service,
      '/api/sync/transactions/status',
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      data: { syncStates: service.states },
    })
    expect(service.listedFor).toBe('owner-1')
  })

  it('starts one resumable transaction sync for the owner', async () => {
    const service = new FakeTransactionSyncService()
    const response = await authenticatedRequest(
      service,
      '/api/sync/transactions',
      'POST',
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { sync: service.result },
    })
    expect(service.synchronizedFor).toBe('owner-1')
  })

  it('maps provider rate limits to a safe response', async () => {
    const service = new FakeTransactionSyncService()
    service.error = new MonobankApiError('rate_limit', 'do not expose', {
      retryable: true,
      retryAfterSeconds: 60,
    })

    const response = await authenticatedRequest(
      service,
      '/api/sync/transactions',
      'POST',
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('60')
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'sync_rate_limited',
        message: 'Transaction sync is temporarily rate limited.',
      },
    })
  })

  it('requires a session before transaction synchronization', async () => {
    const service = new FakeTransactionSyncService()
    const app = createApp(
      () => authenticatedService,
      () => ({}) as AccountService,
      () => service as unknown as TransactionSyncService,
    )

    const response = await app.request(
      '/api/sync/transactions',
      { method: 'POST' },
      environment,
    )

    expect(response.status).toBe(401)
    expect(service.synchronizedFor).toBeNull()
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

async function authenticatedRequest(
  service: FakeTransactionSyncService,
  path: string,
  method = 'GET',
) {
  const app = createApp(
    () => authenticatedService,
    () => ({}) as AccountService,
    () => service as unknown as TransactionSyncService,
  )
  return app.request(
    path,
    {
      headers: {
        Cookie: 'mono_finance_session=test-session',
        Origin: 'http://localhost',
      },
      method,
    },
    environment,
  )
}

class FakeTransactionSyncService {
  error: unknown = null
  listedFor: string | null = null
  synchronizedFor: string | null = null
  readonly states = [
    {
      accountId: 'account-1',
      accountType: 'black',
      currencyCode: 'UAH',
      lastErrorCode: null,
      lastSuccessfulSyncAt: 3_000_000,
      status: 'idle' as const,
    },
  ]
  readonly result = {
    accountId: 'account-1',
    importedCount: 1,
    skippedDuplicateCount: 0,
    status: 'synchronized' as const,
    window: { fromEpochSeconds: 1_000, toEpochSeconds: 2_000 },
  }

  async listStatus(userId: string) {
    this.listedFor = userId
    return this.states
  }

  async synchronizeNext(userId: string) {
    this.synchronizedFor = userId
    if (this.error !== null) {
      throw this.error
    }
    return this.result
  }
}
