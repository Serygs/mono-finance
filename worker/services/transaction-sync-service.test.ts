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
  lastSuccessfulSyncAt: null,
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

  it('imports the current window before resuming a partial historical backfill', async () => {
    const partiallyBackfilled = {
      ...account('account-1'),
      backfillCursorAt: 1_500,
      lastSyncedTransactionAt: 2_000,
    }
    const repository = new FakeRepository([partiallyBackfilled])
    repository.importResult = { importedCount: 1, skippedDuplicateCount: 0 }
    const service = serviceFor(repository, {
      ...transaction,
      occurredAtEpochSeconds: 3_000_000,
    })

    await expect(
      service.synchronizeLatestForAll('owner-1'),
    ).resolves.toMatchObject({
      accountIds: ['account-1'],
      importedCount: 1,
    })
    expect(repository.latestCompletions).toEqual([
      expect.objectContaining({
        accountId: 'account-1',
        lastSyncedTransactionAt: 3_000_000,
      }),
    ])
    expect(repository.completed).toEqual([])
  })

  it('imports current transactions for every active account sequentially', async () => {
    const repository = new FakeRepository([
      account('account-1'),
      account('account-2'),
    ])
    repository.importResult = { importedCount: 1, skippedDuplicateCount: 0 }
    const client = new FakeMonobankClient([transaction])
    const service = new TransactionSyncService(repository, client, {
      nowEpochSeconds: () => 3_000_000,
    })

    await expect(
      service.synchronizeLatestForAll('owner-1'),
    ).resolves.toMatchObject({
      accountIds: ['account-1', 'account-2'],
      importedCount: 2,
    })
    expect(client.requests.map((request) => request.accountId)).toEqual([
      'monobank-account-1',
      'monobank-account-2',
    ])
  })

  it('does not request a statement when the current window has no new time to import', async () => {
    const repository = new FakeRepository([
      { ...account('account-1'), lastSyncedTransactionAt: 3_000_000 },
    ])
    const client = new FakeMonobankClient([])
    const service = new TransactionSyncService(repository, client, {
      nowEpochSeconds: () => 3_000_000,
    })

    await expect(
      service.synchronizeLatestForAll('owner-1'),
    ).resolves.toMatchObject({
      accountIds: ['account-1'],
      importedCount: 0,
    })
    expect(client.requests).toEqual([])
  })

  it('retains duplicate overlap protection during the latest pass', async () => {
    const repository = new FakeRepository([account('account-1')])
    repository.importResult = { importedCount: 0, skippedDuplicateCount: 1 }

    await expect(
      serviceFor(repository, transaction).synchronizeLatestForAll('owner-1'),
    ).resolves.toMatchObject({
      importedCount: 0,
      skippedDuplicateCount: 1,
    })
  })

  it('stops on a provider failure without changing resumable backfill state', async () => {
    const partiallyBackfilled = {
      ...account('account-1'),
      backfillCursorAt: 1_500,
    }
    const repository = new FakeRepository([partiallyBackfilled])
    const client = new FakeMonobankClient([])
    client.error = new MonobankApiError('rate_limit', 'upstream details', {
      retryable: true,
    })
    const service = new TransactionSyncService(repository, client, {
      nowEpochSeconds: () => 3_000_000,
    })

    await expect(
      service.synchronizeLatestForAll('owner-1'),
    ).rejects.toMatchObject({
      code: 'rate_limit',
    })
    expect(repository.failures).toEqual([
      { accountId: 'account-1', errorCode: 'rate_limit' },
    ])
    expect(repository.completed).toEqual([])
    expect(repository.latestCompletions).toEqual([])
  })
})

function serviceFor(
  repository: FakeRepository,
  transactions: TransactionSourceRecord | TransactionSourceRecord[],
): TransactionSyncService {
  const client = new FakeMonobankClient(
    Array.isArray(transactions) ? transactions : [transactions],
  )
  return new TransactionSyncService(repository, client, {
    nowEpochSeconds: () => 3_000_000,
  })
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
  latestCompletions: Array<Record<string, unknown>> = []
  importResult = { importedCount: 0, skippedDuplicateCount: 0 }
  private readonly accounts: ClaimedTransactionSyncAccount[]

  constructor(accounts: ClaimedTransactionSyncAccount[]) {
    this.accounts = accounts
  }

  async claimNext() {
    return this.accounts.shift() ?? null
  }

  async claimNextLatest() {
    return this.accounts.shift() ?? null
  }

  async completeEmptyWindow(accountId: string) {
    this.emptyCompletions.push(accountId)
  }

  async completeWindow(input: Record<string, unknown>) {
    this.completed.push(input)
  }

  async completeLatestWindow(input: Record<string, unknown>) {
    this.latestCompletions.push(input)
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
