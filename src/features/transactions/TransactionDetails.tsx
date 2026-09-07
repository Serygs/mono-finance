import {
  accountLabel,
  formatTransactionAmount,
  formatTransactionTime,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'

interface TransactionDetailsProps {
  onClose(): void
  transaction: TransactionListItem | null
}

export function TransactionDetails({
  onClose,
  transaction,
}: TransactionDetailsProps) {
  if (transaction === null) return null
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
      <strong className="transaction-details-amount">
        {formatTransactionAmount(transaction)}
      </strong>
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
        <div>
          <dt>Original imported amount</dt>
          <dd>
            {new Intl.NumberFormat(undefined, {
              currency: transaction.currencyCode,
              currencyDisplay: 'code',
              minimumFractionDigits: transaction.currencyMinorUnit,
              maximumFractionDigits: transaction.currencyMinorUnit,
              style: 'currency',
            }).format(
              transaction.originalAmountMinor /
                10 ** transaction.currencyMinorUnit,
            )}
          </dd>
        </div>
      </dl>
      {transaction.hasAdjustment ? (
        <p className="transaction-detail-note">
          This transaction has a separate adjustment; imported bank data remains
          unchanged.
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
