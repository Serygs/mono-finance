import { describe, expect, it } from 'vitest'

import {
  TransactionCorrectionService,
  type TransactionCorrectionRepository,
} from './transaction-correction-service'

describe('TransactionCorrectionService', () => {
  it('stores an expense adjustment separately and resolves it for normal analytics without changing the imported amount', async () => {
    const repository = new FakeTransactionCorrectionRepository()
    const service = new TransactionCorrectionService(
      repository,
      () => 1_700_000_000,
    )

    await expect(
      service.saveAdjustment('owner-1', 'transaction-1', {
        adjustedAmountMinor: -1_000,
        note: 'Three friends reimbursed their shares',
      }),
    ).resolves.toEqual({
      effectiveAmountMinor: -1_000,
      hasAdjustment: true,
      id: 'transaction-1',
      isExcluded: false,
    })

    expect(repository.transaction.originalAmountMinor).toBe(-4_000)
    expect(repository.adjustment).toEqual({
      adjustedAmountMinor: -1_000,
      note: 'Three friends reimbursed their shares',
      updatedAt: 1_700_000_000,
    })
    expect(service.resolveForAnalytics(repository.transaction)).toEqual({
      effectiveAmountMinor: -1_000,
      isIncludedInNormalAnalytics: true,
    })
  })

  it('resets an adjustment to the immutable original amount', async () => {
    const repository = new FakeTransactionCorrectionRepository()
    repository.adjustment = {
      adjustedAmountMinor: -1_000,
      note: null,
      updatedAt: 1,
    }
    const service = new TransactionCorrectionService(repository)

    await expect(
      service.resetAdjustment('owner-1', 'transaction-1'),
    ).resolves.toEqual({
      effectiveAmountMinor: -4_000,
      hasAdjustment: false,
      id: 'transaction-1',
      isExcluded: false,
    })

    expect(repository.transaction.originalAmountMinor).toBe(-4_000)
    expect(repository.adjustment).toBeNull()
  })

  it('excludes and restores a transaction without changing its imported source fields', async () => {
    const repository = new FakeTransactionCorrectionRepository()
    const service = new TransactionCorrectionService(
      repository,
      () => 1_700_000_000,
    )

    await service.exclude('owner-1', 'transaction-1', 'Shared purchase')
    expect(service.resolveForAnalytics(repository.transaction)).toEqual({
      effectiveAmountMinor: -4_000,
      isIncludedInNormalAnalytics: false,
    })

    await expect(service.restore('owner-1', 'transaction-1')).resolves.toEqual({
      effectiveAmountMinor: -4_000,
      hasAdjustment: false,
      id: 'transaction-1',
      isExcluded: false,
    })
    expect(repository.transaction).toMatchObject({
      originalAmountMinor: -4_000,
      originalCurrencyCode: 'UAH',
      originalDescription: 'Restaurant',
      originalMcc: 5812,
      originalTimestamp: 1_700_000_000,
      providerTransactionId: 'mono-transaction-1',
    })
  })
})

class FakeTransactionCorrectionRepository implements TransactionCorrectionRepository {
  adjustment: {
    adjustedAmountMinor: number
    note: string | null
    updatedAt: number
  } | null = null
  isExcluded = false
  readonly transaction = {
    adjustmentAmountMinor: null as number | null,
    direction: 'expense' as const,
    id: 'transaction-1',
    isExcluded: false,
    originalAmountMinor: -4_000,
    originalCurrencyCode: 'UAH',
    originalDescription: 'Restaurant',
    originalMcc: 5812,
    originalTimestamp: 1_700_000_000,
    providerTransactionId: 'mono-transaction-1',
  }

  async findOwnedTransaction() {
    return {
      ...this.transaction,
      adjustmentAmountMinor: this.adjustment?.adjustedAmountMinor ?? null,
      isExcluded: this.isExcluded,
    }
  }

  async removeAdjustment(): Promise<void> {
    this.adjustment = null
    this.transaction.adjustmentAmountMinor = null
  }

  async setExcluded(): Promise<void> {
    this.isExcluded = true
    this.transaction.isExcluded = true
  }

  async setRestored(): Promise<void> {
    this.isExcluded = false
    this.transaction.isExcluded = false
  }

  async upsertAdjustment(input: {
    adjustedAmountMinor: number
    note: string | null
    transactionId: string
    updatedAt: number
    userId: string
  }): Promise<void> {
    this.adjustment = {
      adjustedAmountMinor: input.adjustedAmountMinor,
      note: input.note,
      updatedAt: input.updatedAt,
    }
    this.transaction.adjustmentAmountMinor = input.adjustedAmountMinor
  }
}
