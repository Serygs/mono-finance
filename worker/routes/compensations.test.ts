import { describe, expect, it } from 'vitest'
import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import type { AccountService } from '../services/account-service'
import type { CategoryService } from '../services/category-service'
import type { CompensationService } from '../services/compensation-service'
import type { TransactionCorrectionService } from '../services/transaction-correction-service'
import type { TransactionQueryService } from '../services/transaction-query-service'
import type { TransactionSyncService } from '../services/transaction-sync-service'

describe('compensation routes', () => {
  it('returns compensation details and links an income for the authenticated owner', async () => {
    const service = new FakeCompensationService()
    const app = createApp(
      () => authenticatedService,
      () => ({}) as AccountService,
      () => ({}) as TransactionSyncService,
      () => ({}) as TransactionQueryService,
      () => ({}) as TransactionCorrectionService,
      () => ({}) as CategoryService,
      () => service as unknown as CompensationService,
    )
    const details = await app.request(
      '/api/transactions/expense-1/compensations',
      {
        headers: {
          Cookie: 'mono_finance_session=test',
          Origin: 'http://localhost',
        },
      },
      environment,
    )
    expect(details.status).toBe(200)
    const link = await app.request(
      '/api/transactions/expense-1/compensations',
      {
        method: 'POST',
        headers: {
          Cookie: 'mono_finance_session=test',
          Origin: 'http://localhost',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          compensationTransactionId: 'income-1',
          compensatedAmountMinor: 1000,
        }),
      },
      environment,
    )
    expect(link.status).toBe(200)
    expect(service.received).toMatchObject({
      userId: 'owner-1',
      expenseTransactionId: 'expense-1',
    })
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
class FakeCompensationService {
  received: Record<string, unknown> | null = null
  async getDetails(userId: string, expenseTransactionId: string) {
    this.received = { userId, expenseTransactionId }
    return {}
  }
  async link(
    userId: string,
    expenseTransactionId: string,
    input: Record<string, unknown>,
  ) {
    this.received = { userId, expenseTransactionId, ...input }
    return {}
  }
  async unlink() {
    return {}
  }
}
