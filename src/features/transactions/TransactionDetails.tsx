import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  accountLabel,
  formatTransactionAmount,
  formatTransactionTime,
  parseAmountInputToMinor,
} from './transaction-formatting'
import {
  excludeTransaction,
  resetTransactionAdjustment,
  restoreTransaction,
  saveTransactionAdjustment,
} from './transactions-api'
import type {
  TransactionCorrection,
  TransactionListItem,
} from './transaction-types'

interface TransactionDetailsProps {
  onClose(): void
  onTransactionUpdated(
    correction: TransactionCorrection,
    metadata: {
      adjustmentNote?: string | null
      exclusionReason?: string | null
    },
  ): void
  transaction: TransactionListItem | null
}

export function TransactionDetails({
  onClose,
  onTransactionUpdated,
  transaction,
}: TransactionDetailsProps) {
  if (transaction === null) return null
  return (
    <TransactionDetailsContent
      key={transaction.id}
      onClose={onClose}
      onTransactionUpdated={onTransactionUpdated}
      transaction={transaction}
    />
  )
}

function TransactionDetailsContent({
  onClose,
  onTransactionUpdated,
  transaction,
}: Omit<TransactionDetailsProps, 'transaction'> & {
  transaction: TransactionListItem
}) {
  const queryClient = useQueryClient()
  const [adjustmentAmount, setAdjustmentAmount] = useState(() =>
    toEditableAmount(
      transaction.effectiveAmountMinor,
      transaction.currencyMinorUnit,
    ),
  )
  const [adjustmentNote, setAdjustmentNote] = useState(
    transaction.adjustmentNote ?? '',
  )
  const [exclusionReason, setExclusionReason] = useState(
    transaction.exclusionReason ?? '',
  )
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )

  const refreshTransactions = () =>
    void queryClient.invalidateQueries({ queryKey: ['transactions'] })
  const adjustmentMutation = useMutation({
    mutationFn: (input: {
      adjustedAmountMinor: number
      note: string | null
    }) => {
      if (transaction === null) throw new Error('No transaction is selected.')
      return saveTransactionAdjustment(transaction.id, input)
    },
    onSuccess: (correction, input) => {
      onTransactionUpdated(correction, { adjustmentNote: input.note })
      refreshTransactions()
    },
  })
  const resetMutation = useMutation({
    mutationFn: () => {
      if (transaction === null) throw new Error('No transaction is selected.')
      return resetTransactionAdjustment(transaction.id)
    },
    onSuccess: (correction) => {
      onTransactionUpdated(correction, { adjustmentNote: null })
      refreshTransactions()
    },
  })
  const exclusionMutation = useMutation({
    mutationFn: (reason: string | null) => {
      if (transaction === null) throw new Error('No transaction is selected.')
      return excludeTransaction(transaction.id, reason)
    },
    onSuccess: (correction, reason) => {
      onTransactionUpdated(correction, { exclusionReason: reason })
      refreshTransactions()
    },
  })
  const restoreMutation = useMutation({
    mutationFn: () => {
      if (transaction === null) throw new Error('No transaction is selected.')
      return restoreTransaction(transaction.id)
    },
    onSuccess: (correction) => {
      onTransactionUpdated(correction, { exclusionReason: null })
      refreshTransactions()
    },
  })

  const isSaving =
    adjustmentMutation.isPending ||
    resetMutation.isPending ||
    exclusionMutation.isPending ||
    restoreMutation.isPending
  const mutationError =
    adjustmentMutation.error ??
    resetMutation.error ??
    exclusionMutation.error ??
    restoreMutation.error

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const adjustedAmountMinor = parseAmountInputToMinor(
      adjustmentAmount,
      transaction.currencyMinorUnit,
    )
    if (adjustedAmountMinor === null) {
      setValidationMessage(
        `Enter an amount with at most ${transaction.currencyMinorUnit} decimal places.`,
      )
      return
    }
    if (
      (transaction.effectiveAmountMinor < 0 && adjustedAmountMinor > 0) ||
      (transaction.effectiveAmountMinor > 0 && adjustedAmountMinor < 0)
    ) {
      setValidationMessage(
        'The adjusted amount must keep the transaction direction.',
      )
      return
    }
    setValidationMessage(null)
    adjustmentMutation.mutate({
      adjustedAmountMinor,
      note: adjustmentNote.trim() || null,
    })
  }

  return (
    <aside
      aria-label="Transaction details"
      className="transaction-details"
      role="dialog"
    >
      <div className="transaction-details-heading">
        <div>
          <p className="eyebrow">Transaction details</p>
          <h2>{transaction.originalDescription}</h2>
        </div>
        <button className="details-close" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div>
        <strong className="transaction-details-amount">
          {formatTransactionAmount(transaction)}
        </strong>
        {transaction.hasAdjustment ? (
          <span className="transaction-original-amount">
            Original: {formatOriginalAmount(transaction)}
          </span>
        ) : null}
      </div>
      <dl className="transaction-details-list">
        <div>
          <dt>Date and time</dt>
          <dd>{formatTransactionTime(transaction.originalTimestamp)}</dd>
        </div>
        <div>
          <dt>Account</dt>
          <dd>{accountLabel(transaction)}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{transaction.category.name ?? 'Uncategorized'}</dd>
        </div>
      </dl>
      <form className="transaction-correction-form" onSubmit={submitAdjustment}>
        <div>
          <h3>Analytics adjustment</h3>
          <p>
            Changes only the effective amount. Imported bank data stays
            unchanged.
          </p>
        </div>
        <label>
          Effective amount ({transaction.currencyCode})
          <input
            inputMode="decimal"
            onChange={(event) => setAdjustmentAmount(event.target.value)}
            required
            type="text"
            value={adjustmentAmount}
          />
        </label>
        <label>
          Note <span>(optional)</span>
          <textarea
            maxLength={1_000}
            onChange={(event) => setAdjustmentNote(event.target.value)}
            value={adjustmentNote}
          />
        </label>
        <div className="transaction-correction-actions">
          <button disabled={isSaving} type="submit">
            {adjustmentMutation.isPending ? 'Saving…' : 'Save adjustment'}
          </button>
          {transaction.hasAdjustment ? (
            <button
              className="secondary-action"
              disabled={isSaving}
              onClick={() => resetMutation.mutate()}
              type="button"
            >
              Reset adjustment
            </button>
          ) : null}
        </div>
      </form>
      <section
        className="transaction-exclusion"
        aria-labelledby="exclusion-title"
      >
        <div>
          <h3 id="exclusion-title">Analytics exclusion</h3>
          <p>
            Excluded transactions stay in the ledger but are omitted from normal
            analytics.
          </p>
        </div>
        {transaction.isExcluded ? (
          <button
            className="secondary-action"
            disabled={isSaving}
            onClick={() => restoreMutation.mutate()}
            type="button"
          >
            {restoreMutation.isPending ? 'Restoring…' : 'Restore to analytics'}
          </button>
        ) : (
          <>
            <label>
              Reason <span>(optional)</span>
              <textarea
                maxLength={1_000}
                onChange={(event) => setExclusionReason(event.target.value)}
                value={exclusionReason}
              />
            </label>
            <button
              className="danger-action"
              disabled={isSaving}
              onClick={() =>
                exclusionMutation.mutate(exclusionReason.trim() || null)
              }
              type="button"
            >
              {exclusionMutation.isPending
                ? 'Excluding…'
                : 'Exclude from analytics'}
            </button>
          </>
        )}
      </section>
      {validationMessage !== null ? (
        <p className="transaction-correction-error" role="alert">
          {validationMessage}
        </p>
      ) : null}
      {mutationError !== null ? (
        <p className="transaction-correction-error" role="alert">
          Transaction correction could not be saved. Try again later.
        </p>
      ) : null}
      {transaction.hasAdjustment ? (
        <p className="transaction-detail-note">
          Adjusted. Original imported data remains unchanged.
        </p>
      ) : null}
      {transaction.hasCompensation ? (
        <p className="transaction-detail-note">
          This transaction participates in a compensation relationship.
        </p>
      ) : null}
      {transaction.isExcluded ? (
        <p className="transaction-detail-note transaction-detail-excluded">
          Excluded from normal analytics.
        </p>
      ) : null}
    </aside>
  )
}

function formatOriginalAmount(transaction: TransactionListItem): string {
  return new Intl.NumberFormat(undefined, {
    currency: transaction.currencyCode,
    currencyDisplay: 'code',
    minimumFractionDigits: transaction.currencyMinorUnit,
    maximumFractionDigits: transaction.currencyMinorUnit,
    style: 'currency',
  }).format(
    transaction.originalAmountMinor / 10 ** transaction.currencyMinorUnit,
  )
}

function toEditableAmount(amountMinor: number, minorUnit: number): string {
  const sign = amountMinor < 0 ? '-' : ''
  const absolute = Math.abs(amountMinor)
    .toString()
    .padStart(minorUnit + 1, '0')
  if (minorUnit === 0) return `${sign}${absolute}`
  return `${sign}${absolute.slice(0, -minorUnit)}.${absolute.slice(-minorUnit)}`
}
