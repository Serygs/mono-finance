import { Skeleton } from '../../../components/ui/Feedback'
import {
  useLocalization,
  type TranslationKey,
} from '../../localization/localization'
import type { TransactionListItem } from '../../transactions/transaction-types'
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
    <ol className="dashboard-evidence-list recurring-expenses-list">
      {values.slice(0, 5).map((item) => (
        <li key={`${item.description}-${item.currencyCode}`}>
          <span>
            <strong>{item.description}</strong>
            <small>
              {t('About every {days} days · {count} payments', {
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
    <CategoryRankingChart
      units={units}
      values={values.flatMap((item) => [
        {
          amountMinor: item.fixedExpenseAmountMinor,
          currencyCode: item.currencyCode,
          label: t('Recurring / fixed'),
        },
        {
          amountMinor: item.variableExpenseAmountMinor,
          currencyCode: item.currencyCode,
          label: t('Variable'),
        },
      ])}
    />
  )
}
export function AmountEvidenceList({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { detail: string; label: string }>
}) {
  const { locale } = useLocalization()
  return values.length === 0 ? (
    <DashboardEmptyState />
  ) : (
    <ol className="dashboard-evidence-list">
      {values.slice(0, 5).map((item) => (
        <li key={`${item.label}-${item.currencyCode}`}>
          <span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <b className={item.amountMinor > 0 ? 'is-income' : undefined}>
            {formatCurrencyAmount(
              item.amountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
              locale,
            )}
          </b>
        </li>
      ))}
    </ol>
  )
}
export function TransactionEvidenceWidget({
  empty,
  loading,
  locale,
  transactions,
  units,
}: {
  empty: TranslationKey
  loading: boolean
  transactions: TransactionListItem[]
  units: Map<string, number>
  locale: string
}) {
  const { t } = useLocalization()
  return loading ? (
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
        label: item.originalDescription,
      }))}
    />
  )
}
