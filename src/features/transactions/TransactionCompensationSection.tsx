import { Button } from '../../components/ui/Controls'
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
  const { t } = useLocalization()
  const {
    compensationQuery,
    compensationMutation,
    unlinkCompensationMutation,
    compensationTransactionId,
    setCompensationTransactionId,
    compensationAmount,
    setCompensationAmount,
    setValidationMessage,
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
                    )}
                  </dd>
                </div>
                <div>
                  <dt>{t('Compensated')}</dt>
                  <dd>
                    {formatMinorAmount(
                      compensationQuery.data.summary.compensatedAmountMinor,
                      transaction,
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
                    )}
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
    </>
  )
}
