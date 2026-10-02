import { describe, expect, it } from 'vitest'

import { MonobankApiError } from '../monobank/errors'
import type { TransactionSourceRecord } from '../monobank/internal-dtos'
import type { ClientAccountSnapshot } from '../monobank/internal-dtos'
import {
  TransactionSyncService,
  type ClaimedTransactionSyncAccount,
  type TransactionSyncRepository,
} from './transaction-sync-service'

const account = (id: string): ClaimedTransactionSyncAccount => ({
  accountId: id,
  accountType: 'black',
  backfillCursorAt: null,
  backfillStartAt: 1_000,
  currencyCode: 'UAH',
  lastSyncedTransactionAt: null,
  monobankAccountId: `monobank-${id}`,
  userId: 'owner-1',
})

const transaction: TransactionSourceRecord = {
  accountAmountMinor: -500,
  balanceAfterMinor: 2_500,
  cashbackMinor: 0,
  commissionMinor: 0,
  description: 'Coffee',
  direction: 'expense',
  isHold: false,
  mcc: 5812,
  occurredAtEpochSeconds: 2_000,
  operationAmountMinor: -500,
  operationCurrencyNumericCode: '980',
  originalMcc: 5812,
  providerTransactionId: 'transaction-1',
}

describe('TransactionSyncService', () => {
  it('imports one provider-supported window and records duplicate skips', async () => {
    const repository = new FakeRepository([account('account-1')])
    repository.importResult = { importedCount: 1, skippedDuplicateCount: 1 }
    const service = serviceFor(repository, [transaction])

    await expect(service.synchronizeNext('owner-1')).resolves.toMatchObject({
      accountId: 'account-1',
      importedCount: 1,
      skippedDuplicateCount: 1,
      status: 'synchronized',
    })
    expect(repository.completed[0]).toMatchObject({
      accountId: 'account-1',
      lastSyncedTransactionAt: 2_000,
    })
  })

  it('completes an empty terminal window without a provider request', async () => {
    const completed = {
      ...account('account-1'),
      backfillCursorAt: 1_000,
      lastSyncedTransactionAt: 10_000,
    }
    const repository = new FakeRepository([completed])
    const client = new FakeMonobankClient([])
    const service = new TransactionSyncService(repository, client, {
      nowEpochSeconds: () => 10_000,
    })

    await expect(service.synchronizeNext('owner-1')).resolves.toMatchObject({
      status: 'completed',
      window: null,
    })
    expect(client.requests).toEqual([])
    expect(repository.emptyCompletions).toEqual(['account-1'])
  })

  it('records a safe failure and allows the same account to resume later', async () => {
    const repository = new FakeRepository([
      account('account-1'),
      account('account-1'),
    ])
    const client = new FakeMonobankClient([transaction])
    client.error = new MonobankApiError('timeout', 'upstream details', {
      retryable: true,
    })
    const service = new TransactionSyncService(repository, client, {
      nowEpochSeconds: () => 3_000_000,
    })

    await expect(service.synchronizeNext('owner-1')).rejects.toMatchObject({
      code: 'timeout',
    })
    expect(repository.failures).toEqual([
      { accountId: 'account-1', errorCode: 'timeout' },
    ])

    client.error = null
    await expect(service.synchronizeNext('owner-1')).resolves.toMatchObject({
      accountId: 'account-1',
      status: 'synchronized',
    })
  })

  it('processes multiple accounts across separate rate-limited executions', async () => {
    const repository = new FakeRepository([
      account('account-1'),
      account('account-2'),
    ])
    const service = serviceFor(repository, [])

    await service.synchronizeNext('owner-1')
    await service.synchronizeNext('owner-1')

    expect(repository.imports.map((entry) => entry.accountId)).toEqual([
      'account-1',
      'account-2',
    ])
  })
})

function serviceFor(
  repository: FakeRepository,
  transactions: TransactionSourceRecord[],
): TransactionSyncService {
  return new TransactionSyncService(
    repository,
    new FakeMonobankClient(transactions),
    { nowEpochSeconds: () => 3_000_000 },
  )
}

class FakeMonobankClient {
  error: unknown = null
  readonly requests: Array<{ accountId: string }> = []
  private readonly transactions: TransactionSourceRecord[]

  constructor(transactions: TransactionSourceRecord[]) {
    this.transactions = transactions
  }

  async getClientInfo(): Promise<ClientAccountSnapshot> {
    return Promise.reject(new Error('not used'))
  }

  async getStatement(request: { accountId: string }) {
    this.requests.push(request)
    if (this.error !== null) {
      throw this.error
    }
    return this.transactions
  }
}

class FakeRepository implements TransactionSyncRepository {
  completed: Array<Record<string, unknown>> = []
  emptyCompletions: string[] = []
  failures: Array<{ accountId: string; errorCode: string }> = []
  imports: Array<{ accountId: string }> = []
  importResult = { importedCount: 0, skippedDuplicateCount: 0 }
  private readonly accounts: ClaimedTransactionSyncAccount[]

  constructor(accounts: ClaimedTransactionSyncAccount[]) {
    this.accounts = accounts
  }

  async claimNext() {
    return this.accounts.shift() ?? null
  }

  async completeEmptyWindow(accountId: string) {
    this.emptyCompletions.push(accountId)
  }

  async completeWindow(input: Record<string, unknown>) {
    this.completed.push(input)
  }

  async failWindow(accountId: string, errorCode: string) {
    this.failures.push({ accountId, errorCode })
  }

  async importTransactions(input: { accountId: string }) {
    this.imports.push(input)
    return this.importResult
  }

  async listStatusByUser() {
    return []
  }
}
