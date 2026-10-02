import { Button } from '../../components/ui/Controls'
import { useEffect, useRef } from 'react'
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
      hasCompensation?: boolean
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
  const actionButtons = useRef<HTMLDivElement>(null)
  const editorContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (details.editor !== null)
      editorContainer.current
        ?.querySelector<HTMLElement>('input, select, textarea, button')
        ?.focus()
  }, [details.editor])
  function cancelEditing() {
    const previousEditor = details.editor
    details.cancelEditing()
    requestAnimationFrame(() =>
      actionButtons.current
        ?.querySelector<HTMLButtonElement>(`[data-editor="${previousEditor}"]`)
        ?.focus({ preventScroll: true }),
    )
  }
  const editing = { ...details, cancelEditing }
  return (
    <div className="transaction-details">
      <TransactionSummary transaction={transaction} />
      {details.editor === null ? (
        <div className="transaction-detail-actions" ref={actionButtons}>
          <h3>{t('Manage transaction')}</h3>
          <Button
            data-editor="category"
            variant="secondary"
            onClick={() => details.beginEditing('category')}
          >
            {t('Analytics category')}
          </Button>
          <Button
            data-editor="adjustment"
            variant="secondary"
            onClick={() => details.beginEditing('adjustment')}
          >
            {t('Analytics adjustment')}
          </Button>
          {transaction.originalAmountMinor < 0 ? (
            <Button
              data-editor="compensation"
              variant="secondary"
              onClick={() => details.beginEditing('compensation')}
            >
              {t('Compensations')}
            </Button>
          ) : null}
          <Button
            data-editor="exclusion"
            variant="secondary"
            onClick={() => details.beginEditing('exclusion')}
          >
            {t('Analytics exclusion')}
          </Button>
        </div>
      ) : null}
      <div className="transaction-editor" ref={editorContainer}>
        {details.editor === 'category' ? (
          <TransactionCategorySection
            transaction={transaction}
            details={editing}
          />
        ) : null}
        {details.editor === 'compensation' ? (
          <TransactionCompensationSection
            transaction={transaction}
            details={editing}
          />
        ) : null}
        {details.editor === 'adjustment' ? (
          <TransactionAdjustmentSection
            transaction={transaction}
            details={editing}
          />
        ) : null}
        {details.editor === 'exclusion' ? (
          <TransactionExclusionSection
            transaction={transaction}
            details={editing}
          />
        ) : null}
      </div>
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
