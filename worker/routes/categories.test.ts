import { describe, expect, it } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import type { AccountService } from '../services/account-service'
import type { CategoryService } from '../services/category-service'
import { CategoryError } from '../services/category-service'
import type { TransactionCorrectionService } from '../services/transaction-correction-service'
import type { TransactionQueryService } from '../services/transaction-query-service'
import type { TransactionSyncService } from '../services/transaction-sync-service'

describe('category routes', () => {
  it('creates a category and saves a transaction override for the authenticated owner', async () => {
    const service = new FakeCategoryService()
    const app = appFor(service)
    const create = await app.request(
      '/api/categories',
      request('POST', {
        name: 'Shared meals',
        icon: 'leaf',
        colorToken: 'mint',
      }),
      environment,
    )
    expect(create.status).toBe(201)
    expect(service.received).toMatchObject({
      operation: 'create',
      userId: 'owner-1',
    })

    const override = await app.request(
      '/api/transactions/transaction-1/category',
      request('PUT', { categoryId: 'category-1' }),
      environment,
    )
    expect(override.status).toBe(200)
    expect(service.received).toEqual({
      categoryId: 'category-1',
      operation: 'override',
      transactionId: 'transaction-1',
      userId: 'owner-1',
    })
  })

  it('rejects category deletion while it is referenced', async () => {
    const service = new FakeCategoryService()
    service.failure = 'category_referenced'
    const response = await appFor(service).request(
      '/api/categories/category-1',
      request('DELETE'),
      environment,
    )
    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'category_referenced' },
    })
  })
})

function appFor(service: FakeCategoryService) {
  return createApp(
    () => authenticatedService,
    () => ({}) as AccountService,
    () => ({}) as TransactionSyncService,
    () => ({}) as TransactionQueryService,
    () => ({}) as TransactionCorrectionService,
    () => service as unknown as CategoryService,
  )
}
function request(method: string, body?: unknown) {
  return {
    method,
    headers: {
      Cookie: 'mono_finance_session=test-session',
      Origin: 'http://localhost',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }
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
class FakeCategoryService {
  failure: string | null = null
  received: Record<string, unknown> | null = null
  async create(userId: string, input: Record<string, unknown>) {
    this.received = { operation: 'create', userId, ...input }
    return { id: 'category-1', ...input }
  }
  async delete(userId: string, categoryId: string) {
    this.received = { operation: 'delete', userId, categoryId }
    if (this.failure !== null)
      throw new CategoryError(this.failure as 'category_referenced')
  }
  async list() {
    return []
  }
  async resetTransactionOverride(userId: string, transactionId: string) {
    this.received = { operation: 'reset', userId, transactionId }
    return {}
  }
  async setTransactionOverride(
    userId: string,
    transactionId: string,
    categoryId: string,
  ) {
    this.received = { operation: 'override', userId, transactionId, categoryId }
    return {}
  }
  async update() {
    return {}
  }
}
