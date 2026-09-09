import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import {
  getCategories,
  resetTransactionCategory,
  saveTransactionCategory,
} from '../categories/categories-api'

import {
  accountLabel,
  formatTransactionAmount,
  formatTransactionTime,
  parseAmountInputToMinor,
} from './transaction-formatting'
import {
  excludeTransaction,
  getCompensationDetails,
  linkCompensation,
  resetTransactionAdjustment,
  restoreTransaction,
  saveTransactionAdjustment,
  unlinkCompensation,
} from './transactions-api'
import type {
  TransactionCorrection,
  TransactionListItem,
} from './transaction-types'
import { useLocalization } from '../localization/localization'

interface TransactionDetailsProps {
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
  const [categoryId, setCategoryId] = useState(
    transaction.category.source === 'custom'
      ? (transaction.category.id ?? '')
      : '',
  )
  const categoriesQuery = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const compensationQuery = useQuery({
    enabled: transaction.originalAmountMinor < 0,
    queryFn: () => getCompensationDetails(transaction.id),
    queryKey: ['compensations', transaction.id],
  })
  const [compensationTransactionId, setCompensationTransactionId] = useState('')
  const [compensationAmount, setCompensationAmount] = useState('')

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
  const categoryMutation = useMutation({
    mutationFn: (id: string) => saveTransactionCategory(transaction.id, id),
    onSuccess: (result) => {
      onTransactionUpdated(
        { id: transaction.id },
        {
          category: result.category,
          originalCategory: result.originalCategory,
        },
      )
      refreshTransactions()
    },
  })
  const resetCategoryMutation = useMutation({
    mutationFn: () => resetTransactionCategory(transaction.id),
    onSuccess: (result) => {
      setCategoryId('')
      onTransactionUpdated(
        { id: transaction.id },
        {
          category: result.category,
          originalCategory: result.originalCategory,
        },
      )
      refreshTransactions()
    },
  })
  const compensationMutation = useMutation({
    mutationFn: (input: {
      compensationTransactionId: string
      compensatedAmountMinor: number
    }) => linkCompensation(transaction.id, input),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['compensations', transaction.id],
      }),
  })
  const unlinkCompensationMutation = useMutation({
    mutationFn: (linkId: string) => unlinkCompensation(transaction.id, linkId),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['compensations', transaction.id],
      }),
  })

  const isSaving =
    adjustmentMutation.isPending ||
    resetMutation.isPending ||
    exclusionMutation.isPending ||
    restoreMutation.isPending ||
    categoryMutation.isPending ||
    resetCategoryMutation.isPending
  const mutationError =
    adjustmentMutation.error ??
    resetMutation.error ??
    exclusionMutation.error ??
    restoreMutation.error ??
    categoryMutation.error ??
    resetCategoryMutation.error

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const adjustedAmountMinor = parseAmountInputToMinor(
      adjustmentAmount,
      transaction.currencyMinorUnit,
    )
    if (adjustedAmountMinor === null) {
      setValidationMessage(
        t('Enter an amount with at most {count} decimal places.', {
          count: transaction.currencyMinorUnit,
        }),
      )
      return
    }
    if (
      (transaction.effectiveAmountMinor < 0 && adjustedAmountMinor > 0) ||
      (transaction.effectiveAmountMinor > 0 && adjustedAmountMinor < 0)
    ) {
      setValidationMessage(
        t('The adjusted amount must keep the transaction direction.'),
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
    <div className="transaction-details">
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
            {t('Original')}: {formatOriginalAmount(transaction)}
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
                {category.icon ? `${category.icon} ` : ''}
                {category.name}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="transaction-correction-actions">
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
      {transaction.originalAmountMinor < 0 ? (
        <section
          className="transaction-correction-form"
          aria-labelledby="compensation-title"
        >
          <div>
            <h3 id="compensation-title">{t('Compensations')}</h3>
            <p>
              {t(
                'Link confirmed incoming transfers. Bank transactions remain unchanged.',
              )}
            </p>
          </div>
          {compensationQuery.data ? (
            <>
              <dl className="compensation-summary">
                <div>
                  <dt>{t('Original expense')}</dt>
                  <dd>
                    {formatMinor(
                      compensationQuery.data.summary.originalExpenseAmountMinor,
                      transaction,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('Compensated')}</dt>
                  <dd>
                    {formatMinor(
                      compensationQuery.data.summary.compensatedAmountMinor,
                      transaction,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('Personal expense remaining')}</dt>
                  <dd>
                    {formatMinor(
                      compensationQuery.data.summary
                        .remainingPersonalExpenseMinor,
                      transaction,
                    )}
                  </dd>
                </div>
              </dl>
              {compensationQuery.data.links.map((link) => (
                <div className="compensation-link" key={link.id}>
                  <span>
                    {link.description} ·{' '}
                    {formatMinor(link.compensatedAmountMinor, transaction)}
                  </span>
                  <Button
                    disabled={unlinkCompensationMutation.isPending}
                    onClick={() => unlinkCompensationMutation.mutate(link.id)}
                    size="small"
                    type="button"
                    variant="quiet"
                  >
                    {t('Unlink')}
                  </Button>
                </div>
              ))}
              <FormField label={t('Suggested incoming transaction')}>
                <Select
                  value={compensationTransactionId}
                  onChange={(event) => {
                    const candidate = compensationQuery.data?.suggestions.find(
                      (item) => item.transactionId === event.target.value,
                    )
                    setCompensationTransactionId(event.target.value)
                    setCompensationAmount(
                      candidate
                        ? toEditableAmount(
                            Math.min(
                              candidate.availableAmountMinor,
                              -compensationQuery.data.summary
                                .remainingPersonalExpenseMinor,
                            ),
                            transaction.currencyMinorUnit,
                          )
                        : '',
                    )
                  }}
                >
                  <option value="">{t('Choose a suggestion')}</option>
                  {compensationQuery.data.suggestions.map((candidate) => (
                    <option
                      key={candidate.transactionId}
                      value={candidate.transactionId}
                    >
                      {candidate.description} · {candidate.confidenceScore}%
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField
                label={`${t('Compensated amount')} (${transaction.currencyCode})`}
              >
                <input
                  autoComplete="off"
                  inputMode="decimal"
                  name="compensated-amount"
                  value={compensationAmount}
                  onChange={(event) =>
                    setCompensationAmount(event.target.value)
                  }
                />
              </FormField>
              <Button
                disabled={
                  compensationTransactionId === '' ||
                  compensationMutation.isPending
                }
                onClick={() => {
                  const amount = parseAmountInputToMinor(
                    compensationAmount,
                    transaction.currencyMinorUnit,
                  )
                  if (amount === null || amount <= 0) {
                    setValidationMessage(
                      t('Enter a valid positive compensation amount.'),
                    )
                    return
                  }
                  setValidationMessage(null)
                  compensationMutation.mutate({
                    compensationTransactionId,
                    compensatedAmountMinor: amount,
                  })
                }}
                loading={compensationMutation.isPending}
                type="button"
              >
                {compensationMutation.isPending
                  ? t('Linking…')
                  : t('Link compensation')}
              </Button>
            </>
          ) : null}
          {compensationQuery.isPending ? (
            <Skeleton label={t('Loading compensation details…')} lines={2} />
          ) : null}
          {compensationQuery.isError ||
          compensationMutation.isError ||
          unlinkCompensationMutation.isError ? (
            <Alert tone="danger">
              {t('Compensation could not be saved. Try again later.')}
            </Alert>
          ) : null}
        </section>
      ) : null}
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
        <div className="transaction-correction-actions">
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
function formatMinor(
  amountMinor: number,
  transaction: TransactionListItem,
): string {
  return new Intl.NumberFormat(undefined, {
    currency: transaction.currencyCode,
    currencyDisplay: 'code',
    minimumFractionDigits: transaction.currencyMinorUnit,
    maximumFractionDigits: transaction.currencyMinorUnit,
    style: 'currency',
  }).format(amountMinor / 10 ** transaction.currencyMinorUnit)
}

function toEditableAmount(amountMinor: number, minorUnit: number): string {
  const sign = amountMinor < 0 ? '-' : ''
  const absolute = Math.abs(amountMinor)
    .toString()
    .padStart(minorUnit + 1, '0')
  if (minorUnit === 0) return `${sign}${absolute}`
  return `${sign}${absolute.slice(0, -minorUnit)}.${absolute.slice(-minorUnit)}`
}
