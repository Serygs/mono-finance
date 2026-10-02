import { Link } from 'react-router'
import {
  analyticsTransactionFilters,
  transactionDrillDownUrl,
  type AnalyticsTransactionContext,
} from '../../transactions/transaction-drill-down'
import { KpiCard } from '../../../components/ui/Surfaces'
import { useLocalization } from '../../localization/localization'
import type { CurrencyAmount } from '../analytics-api'
import {
  formatCurrencyAmount,
  type DashboardAnalytics,
} from '../dashboard-data'

export function DashboardKpis({
  displayed,
  units,
  context,
}: {
  context: AnalyticsTransactionContext
  displayed: DashboardAnalytics
  units: Map<string, number>
}) {
  const { t } = useLocalization()
  const sharedHelp = `${t('Effective amounts help')} ${t(displayed.overview.currencyConversion.mode === 'base' ? 'Converted amounts help' : 'Original amounts help')}`
  const days = Math.floor((context.dateTo - context.dateFrom) / 86400) + 1
  return (
    <section className="dashboard-kpis" aria-label={t('Period summary')}>
      <DashboardMetric
        accent="pink"
        description={`${t('Total spent help')} ${sharedHelp}`}
        context={context}
        direction="expense"
        title={t('Total spent')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.expenseAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
      <DashboardMetric
        accent="green"
        description={`${t('Total income help')} ${sharedHelp}`}
        context={context}
        direction="income"
        title={t('Total income')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.incomeAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
      <DashboardMetric
        accent="blue"
        description={`${t('Net cash flow help')} ${sharedHelp}`}
        context={context}
        direction={null}
        title={t('Net cash flow')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.netAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
      <DashboardMetric
        accent="violet"
        description={`${t('Average spend / day help')} ${t('Daily average uses {days} days and is rounded to minor units.', { days })} ${sharedHelp}`}
        context={context}
        direction="expense"
        title={t('Average spend / day')}
        units={units}
        values={displayed.overview.averageExpensePerDay}
      />
    </section>
  )
}
function DashboardMetric({
  accent,
  description,
  title,
  units,
  values,
  context,
  direction,
}: {
  context: AnalyticsTransactionContext
  direction: 'expense' | 'income' | null
  accent: 'cyan' | 'blue' | 'green' | 'violet' | 'pink'
  description: string
  title: string
  units: Map<string, number>
  values: CurrencyAmount[]
}) {
  const { locale, t } = useLocalization()
  return (
    <KpiCard
      accent={accent}
      description={description}
      label={title}
      context={
        context.currencyMode === 'base' ? (
          <span>
            {t(
              'Converted totals cannot be explained by the original-currency ledger.',
            )}
          </span>
        ) : null
      }
      value={
        values.length === 0 ? (
          '—'
        ) : (
          <div className="metric-values">
            {values.map((item) => (
              <div key={item.currencyCode}>
                <strong>
                  {formatCurrencyAmount(
                    item.amountMinor,
                    item.currencyCode,
                    units.get(item.currencyCode) ?? 2,
                    locale,
                  )}
                </strong>
                {(() => {
                  const filters = analyticsTransactionFilters(context, {
                    currency: item.currencyCode,
                    direction,
                  })
                  return filters === null ? null : (
                    <Link
                      className="ui-kpi__drill-down"
                      to={transactionDrillDownUrl(filters)}
                      aria-label={t(
                        'View transactions for {metric} · {currency}',
                        { metric: title, currency: item.currencyCode },
                      )}
                    >
                      {t('View transactions')}
                    </Link>
                  )
                })()}
              </div>
            ))}
          </div>
        )
      }
    />
  )
}
