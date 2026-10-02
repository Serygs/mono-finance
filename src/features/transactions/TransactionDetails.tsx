import { Alert } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import type {
  TransactionCorrection,
  TransactionListItem,
} from './transaction-types'
import { TransactionCompensationSection } from './TransactionCompensationSection'
import {
  TransactionAdjustmentSection,
  TransactionCategorySection,
  TransactionExclusionSection,
  TransactionSummary,
} from './TransactionDetailSections'
import { useTransactionDetails } from './use-transaction-details'

export interface TransactionDetailsProps {
  onTransactionUpdated(
    correction: Pick<TransactionCorrection, 'id'> &
      Partial<TransactionCorrection>,
    metadata: {
      adjustmentNote?: string | null
      category?: TransactionListItem['category']
      originalCategory?: TransactionListItem['originalCategory']
      exclusionReason?: string | null
    },
  ): void
  transaction: TransactionListItem | null
}

export function TransactionDetails({
  onTransactionUpdated,
  transaction,
}: TransactionDetailsProps) {
  if (transaction === null) return null
  return (
    <TransactionDetailsContent
      key={transaction.id}
      onTransactionUpdated={onTransactionUpdated}
      transaction={transaction}
    />
  )
}

function TransactionDetailsContent({
  onTransactionUpdated,
  transaction,
}: Omit<TransactionDetailsProps, 'transaction'> & {
  transaction: TransactionListItem
}) {
  const { t } = useLocalization()
  const details = useTransactionDetails({ transaction, onTransactionUpdated })
  const { validationMessage, mutationError } = details
  return (
    <div className="transaction-details">
      <TransactionSummary transaction={transaction} />
      <TransactionCategorySection transaction={transaction} details={details} />
      <TransactionCompensationSection
        transaction={transaction}
        details={details}
      />
      <TransactionAdjustmentSection
        transaction={transaction}
        details={details}
      />
      <TransactionExclusionSection
        transaction={transaction}
        details={details}
      />
      {validationMessage !== null ? (
        <Alert tone="danger">{validationMessage}</Alert>
      ) : null}
      {mutationError !== null ? (
        <Alert tone="danger">
          {t('Transaction correction could not be saved. Try again later.')}
        </Alert>
      ) : null}
      {transaction.hasAdjustment ? (
        <p className="transaction-detail-note">
          {t('Adjusted. Original imported data remains unchanged.')}
        </p>
      ) : null}
      {transaction.hasCompensation ? (
        <p className="transaction-detail-note">
          {t('This transaction participates in a compensation relationship.')}
        </p>
      ) : null}
      {transaction.isExcluded ? (
        <p className="transaction-detail-note transaction-detail-excluded">
          {t('Excluded from normal analytics.')}
        </p>
      ) : null}
    </div>
  )
}
