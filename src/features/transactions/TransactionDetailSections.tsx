import { Button } from '../../components/ui/Controls'
import { FormField, Select } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import {
  accountLabel,
  formatMinorAmount,
  formatTransactionAmount,
  formatTransactionTime,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import type { useTransactionDetails } from './use-transaction-details'

type DetailSectionProps = {
  transaction: TransactionListItem
  details: ReturnType<typeof useTransactionDetails>
}

export function TransactionSummary({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const { t } = useLocalization()
  return (
    <>
      {' '}
      <div className="transaction-details-heading">
        <div>
          <p className="eyebrow">{t('Transaction details')}</p>
          <h2>{transaction.originalDescription}</h2>
        </div>
      </div>
      <div>
        <strong className="transaction-details-amount">
          {formatTransactionAmount(transaction)}
        </strong>
        {transaction.hasAdjustment ? (
          <span className="transaction-original-amount">
            {t('Original')}:{' '}
            {formatMinorAmount(transaction.originalAmountMinor, transaction)}
          </span>
        ) : null}
      </div>
      <dl className="transaction-details-list">
        <div>
          <dt>{t('Date and time')}</dt>
          <dd>{formatTransactionTime(transaction.originalTimestamp)}</dd>
        </div>
        <div>
          <dt>{t('Account')}</dt>
          <dd>{accountLabel(transaction)}</dd>
        </div>
        <div>
          <dt>{t('Category')}</dt>
          <dd>
            {transaction.category.name ?? t('Uncategorized')}
            {(transaction.category.source === 'custom' ||
              transaction.category.source === 'mapped') &&
            transaction.originalCategory.name !== null ? (
              <span className="transaction-original-amount">
                {t('Original')}: {transaction.originalCategory.name}
              </span>
            ) : null}
          </dd>
        </div>
      </dl>
    </>
  )
}
export function TransactionCategorySection({
  transaction,
  details,
}: DetailSectionProps) {
  const { t } = useLocalization()
  const {
    categoryId,
    setCategoryId,
    isSaving,
    categoriesQuery,
    categoryMutation,
    resetCategoryMutation,
  } = details
  return (
    <>
      {' '}
      <section
        className="transaction-correction-form"
        aria-labelledby="category-title"
      >
        <div>
          <h3 id="category-title">{t('Analytics category')}</h3>
          <p>
            {t(
              'Changes analytics classification only. The imported MCC category stays preserved.',
            )}
          </p>
        </div>
        <FormField label={t('Custom category')}>
          <Select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isSaving || categoriesQuery.isPending}
          >
            <option value="">{t('Select a custom category')}</option>
            {(categoriesQuery.data ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="ui-form-actions">
          <Button
            disabled={isSaving || categoryId === ''}
            loading={categoryMutation.isPending}
            onClick={() => categoryMutation.mutate(categoryId)}
            size="small"
            type="button"
          >
            {t(categoryMutation.isPending ? 'Saving…' : 'Save category')}
          </Button>
          {transaction.category.source === 'custom' ? (
            <Button
              disabled={isSaving}
              onClick={() => resetCategoryMutation.mutate()}
              size="small"
              type="button"
              variant="secondary"
            >
              {t('Reset to original')}
            </Button>
          ) : null}
        </div>
      </section>
    </>
  )
}
export function TransactionAdjustmentSection({
  transaction,
  details,
}: DetailSectionProps) {
  const { t } = useLocalization()
  const {
    submitAdjustment,
    adjustmentAmount,
    setAdjustmentAmount,
    adjustmentNote,
    setAdjustmentNote,
    adjustmentMutation,
    isSaving,
    resetMutation,
  } = details
  return (
    <>
      {' '}
      <form className="transaction-correction-form" onSubmit={submitAdjustment}>
        <div>
          <h3>{t('Analytics adjustment')}</h3>
          <p>
            {t(
              'Changes only the effective amount. Imported bank data stays unchanged.',
            )}
          </p>
        </div>
        <FormField
          label={`${t('Effective amount')} (${transaction.currencyCode})`}
        >
          <input
            autoComplete="off"
            inputMode="decimal"
            name="effective-amount"
            onChange={(event) => setAdjustmentAmount(event.target.value)}
            required
            type="text"
            value={adjustmentAmount}
          />
        </FormField>
        <FormField label={t('Note')} hint={t('Optional')}>
          <textarea
            autoComplete="off"
            maxLength={1_000}
            name="adjustment-note"
            onChange={(event) => setAdjustmentNote(event.target.value)}
            value={adjustmentNote}
          />
        </FormField>
        <div className="ui-form-actions">
          <Button loading={adjustmentMutation.isPending} type="submit">
            {t(adjustmentMutation.isPending ? 'Saving…' : 'Save adjustment')}
          </Button>
          {transaction.hasAdjustment ? (
            <Button
              disabled={isSaving}
              onClick={() => resetMutation.mutate()}
              type="button"
              variant="secondary"
            >
              {t('Reset adjustment')}
            </Button>
          ) : null}
        </div>
      </form>
    </>
  )
}
export function TransactionExclusionSection({
  transaction,
  details,
}: DetailSectionProps) {
  const { t } = useLocalization()
  const {
    isSaving,
    restoreMutation,
    exclusionReason,
    setExclusionReason,
    exclusionMutation,
  } = details
  return (
    <>
      {' '}
      <section
        className="transaction-exclusion"
        aria-labelledby="exclusion-title"
      >
        <div>
          <h3 id="exclusion-title">{t('Analytics exclusion')}</h3>
          <p>
            {t(
              'Excluded transactions stay in the ledger but are omitted from normal analytics.',
            )}
          </p>
        </div>
        {transaction.isExcluded ? (
          <Button
            disabled={isSaving}
            loading={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate()}
            type="button"
            variant="secondary"
          >
            {t(
              restoreMutation.isPending ? 'Restoring…' : 'Restore to analytics',
            )}
          </Button>
        ) : (
          <>
            <FormField label={t('Reason')} hint={t('Optional')}>
              <textarea
                autoComplete="off"
                maxLength={1_000}
                name="exclusion-reason"
                onChange={(event) => setExclusionReason(event.target.value)}
                value={exclusionReason}
              />
            </FormField>
            <Button
              disabled={isSaving}
              loading={exclusionMutation.isPending}
              onClick={() =>
                exclusionMutation.mutate(exclusionReason.trim() || null)
              }
              type="button"
              variant="danger"
            >
              {exclusionMutation.isPending
                ? t('Excluding…')
                : t('Exclude from analytics')}
            </Button>
          </>
        )}
      </section>
    </>
  )
}
