import { describe, expect, it } from 'vitest'

import {
  CompensationService,
  type CompensationRepository,
} from './compensation-service'

describe('CompensationService', () => {
  it('links multiple incoming transactions and calculates the remaining personal expense', async () => {
    const repository = new FakeCompensationRepository()
    const service = new CompensationService(repository)

    await service.link('owner-1', 'expense-1', {
      compensatedAmountMinor: 1_000,
      compensationTransactionId: 'income-1',
    })
    const detail = await service.link('owner-1', 'expense-1', {
      compensatedAmountMinor: 2_000,
      compensationTransactionId: 'income-2',
    })

    expect(detail.summary).toEqual({
      compensatedAmountMinor: 3_000,
      currencyCode: 'UAH',
      originalExpenseAmountMinor: -4_000,
      remainingPersonalExpenseMinor: -1_000,
    })
  })

  it('allows a partial compensation without changing either imported transaction', async () => {
    const repository = new FakeCompensationRepository()
    const service = new CompensationService(repository)

    const detail = await service.link('owner-1', 'expense-1', {
      compensatedAmountMinor: 600,
      compensationTransactionId: 'income-1',
    })

    expect(detail.summary.remainingPersonalExpenseMinor).toBe(-3_400)
    expect(repository.transactions.get('expense-1')?.originalAmountMinor).toBe(
      -4_000,
    )
    expect(repository.transactions.get('income-1')?.originalAmountMinor).toBe(
      1_000,
    )
  })

  it('rejects cross-currency and over-allocated incoming transactions', async () => {
    const repository = new FakeCompensationRepository()
    const service = new CompensationService(repository)

    await expect(
      service.link('owner-1', 'expense-1', {
        compensatedAmountMinor: 1,
        compensationTransactionId: 'income-usd',
      }),
    ).rejects.toMatchObject({ code: 'invalid_compensation' })

    await expect(
      service.link('owner-1', 'expense-1', {
        compensatedAmountMinor: 1_001,
        compensationTransactionId: 'income-1',
      }),
    ).rejects.toMatchObject({ code: 'invalid_compensation' })
  })

  it('suggests all same-currency incomes with remaining availability, ranked deterministically', async () => {
    const repository = new FakeCompensationRepository()
    repository.incomes.push(
      transaction(
        'income-related',
        'income',
        1_000,
        'Ivan dinner refund',
        1_700_000_100,
      ),
      transaction(
        'income-unrelated',
        'income',
        50_000,
        'Salary',
        1_600_000_000,
      ),
      transaction(
        'income-linked',
        'income',
        1_000,
        'Petro refund',
        1_700_000_200,
      ),
    )
    repository.links.push(
      link('linked-1', 'expense-other', 'income-linked', 500),
    )
    const service = new CompensationService(repository)

    const detail = await service.getDetails('owner-1', 'expense-1')

    expect(detail.suggestions.map((item) => item.transactionId)).toContain(
      'income-related',
    )
    expect(detail.suggestions).toContainEqual(
      expect.objectContaining({
        availableAmountMinor: 500,
        transactionId: 'income-linked',
      }),
    )
    expect(detail.suggestions[0]?.confidenceScore).toBeGreaterThan(
      detail.suggestions.find(
        (item) => item.transactionId === 'income-unrelated',
      )?.confidenceScore ?? 0,
    )
  })

  it('includes every smaller candidate, including candidates beyond the former twelve and hundred row cutoffs', async () => {
    const repository = new FakeCompensationRepository()
    repository.transactions.set(
      'expense-149',
      transaction('expense-149', 'expense', -149, 'Shared purchase', 1_700_000_000),
    )
    repository.incomes.push(
      ...Array.from({ length: 101 }, (_, index) =>
        transaction(
          `income-${index + 1}`,
          'income',
          1,
          `Refund ${index + 1}`,
          1_700_001_000 + index,
        ),
      ),
    )
    const detail = await new CompensationService(repository).getDetails(
      'owner-1',
      'expense-149',
    )

    expect(detail.suggestions).toHaveLength(104)
    expect(detail.suggestions.map((item) => item.transactionId)).toContain(
      'income-101',
    )
  })

  it('uses the unallocated portion of partially used income and excludes fully allocated income', async () => {
    const repository = new FakeCompensationRepository()
    repository.links.push(
      link('partial', 'expense-other', 'income-1', 400),
      link('full', 'expense-other', 'income-2', 2_000),
    )
    const detail = await new CompensationService(repository).getDetails(
      'owner-1',
      'expense-1',
    )

    expect(detail.suggestions).toContainEqual(
      expect.objectContaining({
        transactionId: 'income-1',
        availableAmountMinor: 600,
      }),
    )
    expect(detail.suggestions.map((item) => item.transactionId)).not.toContain(
      'income-2',
    )

    await expect(
      new CompensationService(repository).link('owner-1', 'expense-1', {
        compensationTransactionId: 'income-1',
        compensatedAmountMinor: 601,
      }),
    ).rejects.toMatchObject({ code: 'invalid_compensation' })
  })
})

type Direction = 'expense' | 'income'
function transaction(
  id: string,
  direction: Direction,
  originalAmountMinor: number,
  originalDescription: string,
  originalTimestamp: number,
  currencyCode = 'UAH',
) {
  return {
    allocatedAmountMinor: 0,
    id,
    direction,
    originalAmountMinor,
    originalCurrencyCode: currencyCode,
    originalDescription,
    originalTimestamp,
  }
}
function link(
  id: string,
  expenseTransactionId: string,
  compensationTransactionId: string,
  compensatedAmountMinor: number,
) {
  return {
    id,
    expenseTransactionId,
    compensationTransactionId,
    compensatedAmountMinor,
    createdAt: 1_700_000_000,
    description: 'Refund',
    originalAmountMinor: 1_000,
    originalTimestamp: 1_700_000_000,
  }
}
class FakeCompensationRepository implements CompensationRepository {
  readonly transactions = new Map([
    [
      'expense-1',
      transaction(
        'expense-1',
        'expense',
        -4_000,
        'Dinner with Ivan',
        1_700_000_000,
      ),
    ],
    [
      'expense-other',
      transaction(
        'expense-other',
        'expense',
        -1_000,
        'Other dinner',
        1_700_000_000,
      ),
    ],
    [
      'income-1',
      transaction('income-1', 'income', 1_000, 'Ivan refund', 1_700_000_100),
    ],
    [
      'income-2',
      transaction('income-2', 'income', 2_000, 'Petro refund', 1_700_000_200),
    ],
    [
      'income-usd',
      transaction(
        'income-usd',
        'income',
        1_000,
        'USD refund',
        1_700_000_300,
        'USD',
      ),
    ],
  ])
  readonly incomes: ReturnType<typeof transaction>[] = []
  readonly links: ReturnType<typeof link>[] = []
  async findOwnedTransaction(id: string) {
    return (
      this.transactions.get(id) ??
      this.incomes.find((item) => item.id === id) ??
      null
    )
  }
  async findExpenseLinks(expenseTransactionId: string) {
    return this.links.filter(
      (item) => item.expenseTransactionId === expenseTransactionId,
    )
  }
  async findIncomeLinks(compensationTransactionId: string) {
    return this.links.filter(
      (item) => item.compensationTransactionId === compensationTransactionId,
    )
  }
  async findIncomeCandidates() {
    return [...this.transactions.values(), ...this.incomes]
      .filter((item) => item.direction === 'income')
      .map((item) => ({
        ...item,
        allocatedAmountMinor: this.links
          .filter((link) => link.compensationTransactionId === item.id)
          .reduce((total, link) => total + link.compensatedAmountMinor, 0),
      }))
  }
  async createLink(input: {
    expenseTransactionId: string
    compensationTransactionId: string
    compensatedAmountMinor: number
  }) {
    this.links.push(
      link(
        `link-${this.links.length + 1}`,
        input.expenseTransactionId,
        input.compensationTransactionId,
        input.compensatedAmountMinor,
      ),
    )
  }
  async deleteLink() {}
}
