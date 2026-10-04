import { Button } from '../../../components/ui/Controls'
import { Alert, Skeleton } from '../../../components/ui/Feedback'
import { formatMoney } from '../../../lib/money-presentation'
import {
  useLocalization,
  type TranslationKey,
} from '../../localization/localization'
import type {
  TransactionDirection,
  TransactionListItem,
} from '../../transactions/transaction-types'
import type { CurrencyAmount } from '../analytics-api'
import { formatCurrencyAmount, formatPeriod } from '../dashboard-data'
import { DashboardEmptyState } from '../DashboardEmptyState'
import { CategoryRankingChart } from '../widgets/DashboardCharts'

export function RecurringExpensesWidget({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<{
    averageAmountMinor: number
    currencyCode: string
    description: string
    frequencyDays: number
    lastAmountMinor: number
    transactionCount: number
  }>
}) {
  const { locale, t } = useLocalization()
  return values.length === 0 ? (
    <DashboardEmptyState />
  ) : (
    <>
      <p className="dashboard-evidence-note">
        {t('Repeated purchases do not establish recurring or fixed expenses.')}
      </p>
      <ol className="dashboard-evidence-list recurring-expenses-list">
        {values.slice(0, 5).map((item) => (
          <li key={`${item.description}-${item.currencyCode}`}>
            <span>
              <strong>{item.description}</strong>
              <small>
                {t('Average interval: {days} days · {count} purchases', {
                  count: item.transactionCount,
                  days: item.frequencyDays,
                })}
              </small>
            </span>
            <b>
              {t('Average')}{' '}
              {formatCurrencyAmount(
                item.averageAmountMinor,
                item.currencyCode,
                units.get(item.currencyCode) ?? 2,
                locale,
              )}
              <small>
                {t('Last')}{' '}
                {formatCurrencyAmount(
                  item.lastAmountMinor,
                  item.currencyCode,
                  units.get(item.currencyCode) ?? 2,
                  locale,
                )}
              </small>
            </b>
          </li>
        ))}
      </ol>
    </>
  )
}
export function FixedVariableExpensesWidget({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<{
    currencyCode: string
    fixedExpenseAmountMinor: number
    variableExpenseAmountMinor: number
  }>
}) {
  const { t } = useLocalization()
  if (values.length === 0) return <DashboardEmptyState />
  return (
    <>
      <p className="dashboard-evidence-note">
        {t('Repeated purchases do not establish recurring or fixed expenses.')}
      </p>
      <CategoryRankingChart
        percentageLabel="{percent}% of period expenses"
        units={units}
        values={values.flatMap((item) => [
          {
            amountMinor: item.fixedExpenseAmountMinor,
            currencyCode: item.currencyCode,
            label: t('Repeated purchases'),
          },
          {
            amountMinor: item.variableExpenseAmountMinor,
            currencyCode: item.currencyCode,
            label: t('Other expenses'),
          },
        ])}
      />
    </>
  )
}
export function AmountEvidenceList({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<
    CurrencyAmount & {
      detail: string
      direction: TransactionDirection
      label: string
      transactionId?: string
    }
  >
}) {
  const { locale, t } = useLocalization()
  return values.length === 0 ? (
    <DashboardEmptyState />
  ) : (
    <ol className="dashboard-evidence-list">
      {values.slice(0, 5).map((item) => (
        <li key={item.transactionId ?? `${item.label}-${item.currencyCode}`}>
          <span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <b className={item.direction === 'income' ? 'is-income' : undefined}>
            {formatMoney(
              item.direction === 'expense'
                ? -Math.abs(item.amountMinor)
                : Math.abs(item.amountMinor),
              {
                currencyCode: item.currencyCode,
                minorUnit: units.get(item.currencyCode) ?? 2,
                locale,
                signDisplay: 'exceptZero',
                unknownMinorUnitsLabel: t('minor units'),
              },
            ).replace(/^-/, '\u2212')}
            <small>
              {t(item.direction === 'income' ? 'Income' : 'Expenses')}
            </small>
          </b>
        </li>
      ))}
    </ol>
  )
}
export interface TransactionEvidenceState {
  error: boolean
  loading: boolean
  onRetry(): void
  transactions: TransactionListItem[]
}

export function TransactionEvidenceWidget({
  empty,
  error,
  loading,
  locale,
  onRetry,
  transactions,
  units,
}: TransactionEvidenceState & {
  empty: TranslationKey
  units: Map<string, number>
  locale: string
}) {
  const { t } = useLocalization()
  return error ? (
    <Alert tone="danger" title={t('Transactions could not be loaded')}>
      <Button variant="secondary" onClick={onRetry}>
        {t('Retry')}
      </Button>
    </Alert>
  ) : loading ? (
    <Skeleton label={t('Loading…')} lines={3} />
  ) : transactions.length === 0 ? (
    <DashboardEmptyState message={empty} />
  ) : (
    <AmountEvidenceList
      units={units}
      values={transactions.map((item) => ({
        amountMinor: item.effectiveAmountMinor,
        currencyCode: item.currencyCode,
        detail: formatPeriod(item.originalTimestamp, 'day', locale),
        direction: item.originalAmountMinor < 0 ? 'expense' : 'income',
        label: item.originalDescription,
        transactionId: item.id,
      }))}
    />
  )
}
