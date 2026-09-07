import { describe, expect, it } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import type { AccountService } from '../services/account-service'
import type { TransactionCorrectionService } from '../services/transaction-correction-service'
import type { TransactionQueryService } from '../services/transaction-query-service'
import type { TransactionSyncService } from '../services/transaction-sync-service'

describe('transaction correction routes', () => {
  it('saves a validated adjustment for the authenticated owner', async () => {
    const service = new FakeTransactionCorrectionService()
    const response = await request(
      service,
      '/api/transactions/transaction-1/adjustment',
      'PUT',
      {
        adjustedAmountMinor: -1_000,
        note: 'Shared meal',
      },
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      data: { correction: service.result },
    })
    expect(service.received).toEqual({
      input: { adjustedAmountMinor: -1_000, note: 'Shared meal' },
      operation: 'saveAdjustment',
      transactionId: 'transaction-1',
      userId: 'owner-1',
    })
  })

  it('resets the adjustment and restores an exclusion without a request body', async () => {
    const service = new FakeTransactionCorrectionService()

    const resetResponse = await request(
      service,
      '/api/transactions/transaction-1/adjustment',
      'DELETE',
    )
    expect(resetResponse.status).toBe(200)
    expect(service.received?.['operation']).toBe('resetAdjustment')

    const restoreResponse = await request(
      service,
      '/api/transactions/transaction-1/exclusion',
      'DELETE',
    )
    expect(restoreResponse.status).toBe(200)
    expect(service.received).toEqual({
      operation: 'restore',
      transactionId: 'transaction-1',
      userId: 'owner-1',
    })
  })

  it('rejects malformed money input before calling the service', async () => {
    const service = new FakeTransactionCorrectionService()
    const response = await request(
      service,
      '/api/transactions/transaction-1/adjustment',
      'PUT',
      {
        adjustedAmountMinor: -10.5,
      },
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'validation_error',
        message: 'Invalid transaction correction.',
      },
    })
    expect(service.received).toBeNull()
  })

  it('requires an authenticated same-origin request before writing a correction', async () => {
    const service = new FakeTransactionCorrectionService()
    const app = appFor(service)
    const response = await app.request(
      '/api/transactions/transaction-1/exclusion',
      { method: 'PUT' },
      environment,
    )

    expect(response.status).toBe(401)
    expect(service.received).toBeNull()
  })
})

function appFor(service: FakeTransactionCorrectionService) {
  return createApp(
    () => authenticatedService,
    () => ({}) as AccountService,
    () => ({}) as TransactionSyncService,
    () => ({}) as TransactionQueryService,
    () => service as unknown as TransactionCorrectionService,
  )
}

async function request(
  service: FakeTransactionCorrectionService,
  path: string,
  method: 'PUT' | 'DELETE',
  body?: unknown,
) {
  return appFor(service).request(
    path,
    {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: {
        Cookie: 'mono_finance_session=test-session',
        Origin: 'http://localhost',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      method,
    },
    environment,
  )
}

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

class FakeTransactionCorrectionService {
  received: Record<string, unknown> | null = null
  readonly result = {
    effectiveAmountMinor: -1_000,
    hasAdjustment: true,
    id: 'transaction-1',
    isExcluded: false,
  }

  async exclude(userId: string, transactionId: string, reason: string | null) {
    this.received = { operation: 'exclude', reason, transactionId, userId }
    return this.result
  }

  async resetAdjustment(userId: string, transactionId: string) {
    this.received = { operation: 'resetAdjustment', transactionId, userId }
    return this.result
  }

  async restore(userId: string, transactionId: string) {
    this.received = { operation: 'restore', transactionId, userId }
    return this.result
  }

  async saveAdjustment(
    userId: string,
    transactionId: string,
    input: { adjustedAmountMinor: number; note: string | null },
  ) {
    this.received = {
      input,
      operation: 'saveAdjustment',
      transactionId,
      userId,
    }
    return this.result
  }
}
