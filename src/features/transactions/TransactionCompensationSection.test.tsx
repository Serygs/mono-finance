import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TransactionCompensationSection } from './TransactionCompensationSection'
import type { TransactionListItem } from './transaction-types'
import type { useTransactionDetails } from './use-transaction-details'

const transaction: TransactionListItem = {
  account: { id: 'account-1', maskedPan: null, type: 'black' },
  adjustmentNote: null,
  category: { id: null, name: null, source: null },
  currencyCode: 'UAH',
  currencyMinorUnit: 2,
  effectiveAmountMinor: -100_000,
  exclusionReason: null,
  hasAdjustment: false,
  hasCompensation: false,
  id: 'expense-1',
  isExcluded: false,
  originalAmountMinor: -100_000,
  originalCategory: { id: null, name: null },
  originalDescription: 'Restaurant',
  originalMcc: 5812,
  originalTimestamp: 1_800_000_000,
}

const timestamp = Date.UTC(2026, 11, 20, 12) / 1000

const details = {
  cancelEditing() {},
  clearFeedback() {},
  compensationAmount: '',
  compensationMutation: { isPending: false },
  compensationQuery: {
    data: {
      links: [],
      suggestions: [
        {
          availableAmountMinor: 25_500,
          confidenceScore: 80,
          description: 'From: Synthetic Friend',
          originalTimestamp: timestamp,
          transactionId: 'income-1',
        },
      ],
      summary: {
        compensatedAmountMinor: 0,
        currencyCode: 'UAH',
        originalExpenseAmountMinor: -100_000,
        remainingPersonalExpenseMinor: -100_000,
      },
    },
    isError: false,
    isFetching: false,
    isPending: false,
  },
  compensationTransactionId: '',
  editor: 'compensation',
  isSaving: false,
  mutationError: null,
  saved: false,
  setCompensationAmount() {},
  setCompensationTransactionId() {},
  setValidationMessage() {},
  unlinkCompensationMutation: { isPending: false },
  validationMessage: null,
} as unknown as ReturnType<typeof useTransactionDetails>

describe('compensation suggestions', () => {
  it('label each suggestion with its amount and date instead of a confidence score', () => {
    const markup = renderToStaticMarkup(
      <TransactionCompensationSection
        details={details}
        transaction={transaction}
      />,
    )
    const option = /<option value="income-1">([^<]*)<\/option>/.exec(markup)
    expect(option?.[1]).toContain('From: Synthetic Friend')
    expect(option?.[1]).toContain('255.00')
    expect(option?.[1]).toContain('12/20/2026')
    expect(option?.[1]).not.toContain('80%')
  })
})
