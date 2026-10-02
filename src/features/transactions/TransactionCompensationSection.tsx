import { Button } from '../../components/ui/Controls'
import { TransactionEditActions } from './TransactionDetailSections'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { useLocalization } from '../localization/localization'
import { toEditableAmount } from './transaction-amount-input'
import {
  formatMinorAmount,
  parseAmountInputToMinor,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import type { useTransactionDetails } from './use-transaction-details'

type DetailSectionProps = {
  transaction: TransactionListItem
  details: ReturnType<typeof useTransactionDetails>
}

export function TransactionCompensationSection({
  transaction,
  details,
}: DetailSectionProps) {
  const { locale, t } = useLocalization()
  const {
    compensationQuery,
    compensationMutation,
    unlinkCompensationMutation,
    compensationTransactionId,
    setCompensationTransactionId,
    compensationAmount,
    setCompensationAmount,
    setValidationMessage,
    isSaving,
  } = details
  return (
    <>
      {' '}
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
                    {formatMinorAmount(
                      compensationQuery.data.summary.originalExpenseAmountMinor,
                      transaction,
                      locale,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('Compensated')}</dt>
                  <dd>
                    {formatMinorAmount(
                      compensationQuery.data.summary.compensatedAmountMinor,
                      transaction,
                      locale,
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('Personal expense remaining')}</dt>
                  <dd>
                    {formatMinorAmount(
                      compensationQuery.data.summary
                        .remainingPersonalExpenseMinor,
                      transaction,
                      locale,
                    )}
                  </dd>
                </div>
              </dl>
              {compensationQuery.data.links.map((link) => (
                <div className="compensation-link" key={link.id}>
                  <span>
                    {link.description} ·{' '}
                    {formatMinorAmount(
                      link.compensatedAmountMinor,
                      transaction,
                      locale,
                    )}
                  </span>
                  <Button
                    disabled={isSaving}
                    loading={
                      unlinkCompensationMutation.isPending &&
                      unlinkCompensationMutation.variables === link.id
                    }
                    onClick={() => unlinkCompensationMutation.mutate(link.id)}
                    size="small"
                    type="button"
                    variant="quiet"
                  >
                    {t(
                      unlinkCompensationMutation.isPending &&
                        unlinkCompensationMutation.variables === link.id
                        ? 'Unlinking…'
                        : 'Unlink',
                    )}
                  </Button>
                </div>
              ))}
              <FormField label={t('Suggested incoming transaction')}>
                <Select
                  disabled={isSaving}
                  value={compensationTransactionId}
                  onChange={(event) => {
                    details.clearFeedback()
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
                  disabled={isSaving}
                  autoComplete="off"
                  inputMode="decimal"
                  name="compensated-amount"
                  value={compensationAmount}
                  onChange={(event) => {
                    details.clearFeedback()
                    setCompensationAmount(event.target.value)
                  }}
                />
              </FormField>
              <TransactionEditActions details={details}>
                <Button
                  disabled={
                    compensationTransactionId === '' ||
                    isSaving ||
                    compensationQuery.isFetching
                  }
                  onClick={() => {
                    if (isSaving) return
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
                    const candidate = compensationQuery.data?.suggestions.find(
                      (item) =>
                        item.transactionId === compensationTransactionId,
                    )
                    if (
                      !candidate ||
                      amount > candidate.availableAmountMinor ||
                      amount >
                        -compensationQuery.data.summary
                          .remainingPersonalExpenseMinor
                    ) {
                      setValidationMessage(
                        t(
                          'Compensation exceeds the available income or remaining expense.',
                        ),
                      )
                      return
                    }
                    setValidationMessage(null)
                    compensationMutation.mutate(
                      {
                        compensationTransactionId,
                        compensatedAmountMinor: amount,
                      },
                      {
                        onSuccess: () => {
                          setCompensationTransactionId('')
                          setCompensationAmount('')
                        },
                      },
                    )
                  }}
                  loading={compensationMutation.isPending}
                  type="button"
                >
                  {compensationMutation.isPending
                    ? t('Linking…')
                    : t('Link compensation')}
                </Button>
              </TransactionEditActions>
              {compensationQuery.data.suggestions.length === 0 ? (
                <p>
                  {t('No incoming transactions available for compensation.')}
                </p>
              ) : null}
            </>
          ) : null}
          {compensationQuery.isPending ? (
            <Skeleton label={t('Loading compensation details…')} lines={2} />
          ) : null}
          {compensationQuery.isError ? (
            <Alert tone="danger">
              <p>{t('Compensation details could not be loaded.')}</p>
              <Button
                variant="secondary"
                onClick={() => void compensationQuery.refetch()}
              >
                {t('Retry')}
              </Button>
            </Alert>
          ) : null}
          {!compensationQuery.data ? (
            <Button variant="quiet" onClick={details.cancelEditing}>
              {t('Cancel')}
            </Button>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
