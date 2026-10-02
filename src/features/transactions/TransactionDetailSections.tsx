import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Icon } from '../../components/ui/Icon'
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
  const { locale, t } = useLocalization()
  return (
    <section
      className="transaction-summary"
      aria-label={t('Transaction details')}
    >
      <h3 className="transaction-merchant">
        {transaction.originalDescription}
      </h3>
      <strong
        className={`transaction-details-amount${transaction.effectiveAmountMinor > 0 ? ' is-income' : ''}`}
      >
        {formatTransactionAmount(transaction, locale)}
      </strong>
      {transaction.hasAdjustment ? (
        <p className="transaction-original-amount">
          <span>{t('Original')}:</span>{' '}
          {formatMinorAmount(
            transaction.originalAmountMinor,
            transaction,
            locale,
          )}
        </p>
      ) : null}
      <dl className="transaction-details-list">
        <div>
          <dt>{t('Date and time')}</dt>
          <dd>
            {formatTransactionTime(transaction.originalTimestamp, locale)}
          </dd>
        </div>
        <div>
          <dt>{t('Account')}</dt>
          <dd>{accountLabel(transaction)}</dd>
        </div>
        <div>
          <dt>{t('Category')}</dt>
          <dd>{transaction.category.name ?? t('Uncategorized')}</dd>
        </div>
      </dl>
      <details className="transaction-original-information">
        <summary>
          <span>{t('Original bank information')}</span>
          <Icon name="chevron" />
        </summary>
        <dl className="transaction-details-list">
          <div>
            <dt>{t('Description')}</dt>
            <dd>{transaction.originalDescription}</dd>
          </div>
          <div>
            <dt>{t('Original amount')}</dt>
            <dd>
              {formatMinorAmount(
                transaction.originalAmountMinor,
                transaction,
                locale,
              )}
            </dd>
          </div>
          <div>
            <dt>{t('Original category')}</dt>
            <dd>{transaction.originalCategory.name ?? t('Uncategorized')}</dd>
          </div>
          <div>
            <dt>{t('MCC')}</dt>
            <dd>{transaction.originalMcc ?? t('Not available')}</dd>
          </div>
          <div>
            <dt>{t('Account')}</dt>
            <dd>
              {transaction.account.type}
              <br />
              {transaction.account.maskedPan ?? transaction.account.id}
            </dd>
          </div>
          <div>
            <dt>{t('Account ID')}</dt>
            <dd>{transaction.account.id}</dd>
          </div>
        </dl>
      </details>
    </section>
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
            onChange={(event) => {
              details.clearFeedback()
              setCategoryId(event.target.value)
            }}
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
        {categoriesQuery.isError ? (
          <p role="alert">
            {t('Categories could not be loaded.')}{' '}
            <Button
              variant="quiet"
              onClick={() => void categoriesQuery.refetch()}
            >
              {t('Retry')}
            </Button>
          </p>
        ) : null}
        <Link to="/settings#categories">{t('Manage category visuals')}</Link>
        <TransactionEditActions details={details}>
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
              loading={resetCategoryMutation.isPending}
              onClick={() => resetCategoryMutation.mutate()}
              size="small"
              type="button"
              variant="secondary"
            >
              {t(
                resetCategoryMutation.isPending
                  ? 'Resetting…'
                  : 'Reset to original',
              )}
            </Button>
          ) : null}
        </TransactionEditActions>
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
            disabled={isSaving}
            inputMode="decimal"
            name="effective-amount"
            onChange={(event) => {
              details.clearFeedback()
              setAdjustmentAmount(event.target.value)
            }}
            required
            type="text"
            value={adjustmentAmount}
          />
        </FormField>
        <FormField label={t('Note')} hint={t('Optional')}>
          <textarea
            autoComplete="off"
            disabled={isSaving}
            maxLength={1_000}
            name="adjustment-note"
            onChange={(event) => {
              details.clearFeedback()
              setAdjustmentNote(event.target.value)
            }}
            value={adjustmentNote}
          />
        </FormField>
        <TransactionEditActions details={details}>
          <Button
            disabled={isSaving}
            loading={adjustmentMutation.isPending}
            type="submit"
          >
            {t(adjustmentMutation.isPending ? 'Saving…' : 'Save adjustment')}
          </Button>
          {transaction.hasAdjustment ? (
            <Button
              disabled={isSaving}
              loading={resetMutation.isPending}
              onClick={() => resetMutation.mutate()}
              type="button"
              variant="secondary"
            >
              {t(resetMutation.isPending ? 'Resetting…' : 'Reset adjustment')}
            </Button>
          ) : null}
        </TransactionEditActions>
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
      {!transaction.isExcluded ? (
        <FormField label={t('Reason')} hint={t('Optional')}>
          <textarea
            autoComplete="off"
            disabled={isSaving}
            maxLength={1000}
            name="exclusion-reason"
            onChange={(event) => {
              details.clearFeedback()
              setExclusionReason(event.target.value)
            }}
            value={exclusionReason}
          />
        </FormField>
      ) : null}
      <TransactionEditActions details={details}>
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
          <Button
            disabled={isSaving}
            loading={exclusionMutation.isPending}
            onClick={() =>
              exclusionMutation.mutate(exclusionReason.trim() || null)
            }
            type="button"
            variant="danger"
          >
            {t(
              exclusionMutation.isPending
                ? 'Excluding…'
                : 'Exclude from analytics',
            )}
          </Button>
        )}
      </TransactionEditActions>
    </section>
  )
}

// Every editor shares one keyboard-safe action/feedback area inside the native sheet.
export function TransactionEditActions({
  details,
  children,
}: {
  details: ReturnType<typeof useTransactionDetails>
  children: ReactNode
}) {
  const { t } = useLocalization()
  return (
    <div className="transaction-edit-actions">
      {details.validationMessage !== null ? (
        <Alert tone="danger">{details.validationMessage}</Alert>
      ) : null}
      {details.mutationError !== null ? (
        <Alert tone="danger">
          {t(
            details.editor === 'compensation'
              ? 'Compensation could not be saved. Try again later.'
              : 'Transaction correction could not be saved. Try again later.',
          )}
        </Alert>
      ) : null}
      {details.saved && details.validationMessage === null ? (
        <Alert tone="success">{t('Changes saved.')}</Alert>
      ) : null}
      <div className="transaction-edit-buttons">
        <Button
          disabled={details.isSaving}
          variant="quiet"
          type="button"
          onClick={details.cancelEditing}
        >
          {t('Cancel')}
        </Button>
        {children}
      </div>
    </div>
  )
}
