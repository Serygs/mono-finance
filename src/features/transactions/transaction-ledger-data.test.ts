import { describe, expect, it } from 'vitest'
import { loadedTransactions } from './transaction-ledger-data'
import {
  formatDateGroupAmount,
  formatMinorAmount,
  formatTransactionClock,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'

const transaction: TransactionListItem = {
  id: 'expense',
  account: { id: 'account', maskedPan: null, type: 'black' },
  category: { id: null, name: null, source: null },
  originalCategory: { id: null, name: null },
  currencyCode: 'UAH',
  currencyMinorUnit: 2,
  effectiveAmountMinor: -4000,
  originalAmountMinor: -4000,
  originalDescription: 'Synthetic merchant',
  originalTimestamp: 1735689600,
  originalMcc: null,
  adjustmentNote: null,
  exclusionReason: null,
  hasAdjustment: false,
  hasCompensation: false,
  isExcluded: false,
}

describe('loaded ledger presentation', () => {
  it('deduplicates overlapping cursor pages without changing cached rows or API order', () => {
    const income = { ...transaction, id: 'income', effectiveAmountMinor: 1000 }
    const pages = [
      { nextCursor: 'next', transactions: [transaction] },
      { nextCursor: null, transactions: [transaction, income] },
    ]
    expect(loadedTransactions(pages)).toEqual([transaction, income])
    expect(pages[1]!.transactions).toHaveLength(2)
    expect(loadedTransactions([])).toEqual([])
  })

  it('sums only shown effective values exactly even when their sum exceeds safe numeric precision', () => {
    const large = {
      ...transaction,
      effectiveAmountMinor: -Number.MAX_SAFE_INTEGER,
    }
    expect(
      formatDateGroupAmount([large, { ...large, id: 'second' }], 'en'),
    ).toBe(formatMinorAmount(-18014398509481982n, large, 'en'))
    expect(
      formatDateGroupAmount(
        [
          { ...transaction, isExcluded: true },
          { ...transaction, effectiveAmountMinor: 1000 },
        ],
        'en',
      ),
    ).toBe(formatMinorAmount(-3000n, transaction, 'en'))
  })

  it('omits a shared total for mixed currencies or incompatible minor units', () => {
    expect(
      formatDateGroupAmount(
        [transaction, { ...transaction, currencyCode: 'USD' }],
        'en',
      ),
    ).toBe('')
    expect(
      formatDateGroupAmount(
        [transaction, { ...transaction, currencyMinorUnit: 0 }],
        'en',
      ),
    ).toBe('')
  })

  it('shows income signs, zero amounts and currency precision in the selected locale', () => {
    const unknown = { ...transaction, currencyCode: '999' }
    expect(formatMinorAmount(101, unknown, 'en')).toBe(
      '+101 minor units · ISO 999',
    )
    expect(formatMinorAmount(-101, unknown, 'uk')).toBe(
      '−101 мінорних одиниць · ISO 999',
    )
    expect(formatMinorAmount(101, transaction, 'en')).toContain('+')
    expect(formatMinorAmount(0, transaction, 'en')).not.toContain('+')
    expect(formatMinorAmount(101, transaction, 'uk')).toContain('1,01')
    expect(
      formatMinorAmount(
        101,
        { ...transaction, currencyCode: 'JPY', currencyMinorUnit: 0 },
        'en',
      ),
    ).not.toContain('.00')
    expect(formatTransactionClock(transaction.originalTimestamp, 'uk')).toBe(
      new Intl.DateTimeFormat('uk', { timeStyle: 'short' }).format(
        new Date(transaction.originalTimestamp * 1000),
      ),
    )
  })
})
