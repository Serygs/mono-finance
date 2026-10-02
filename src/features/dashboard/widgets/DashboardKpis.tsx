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
}: {
  displayed: DashboardAnalytics
  units: Map<string, number>
}) {
  const { t } = useLocalization()
  return (
    <section className="dashboard-kpis" aria-label={t('Period summary')}>
      <DashboardMetric
        accent="cyan"
        description={t('Total spent help')}
        title={t('Total spent')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.expenseAmountMinor,
          currencyCode: item.currencyCode,
        }))}
        icon="−"
      />
      <DashboardMetric
        accent="blue"
        description={t('Total income help')}
        title={t('Total income')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.incomeAmountMinor,
          currencyCode: item.currencyCode,
        }))}
        icon="↑"
      />
      <DashboardMetric
        accent="green"
        description={t('Net cash flow help')}
        title={t('Net cash flow')}
        units={units}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.netAmountMinor,
          currencyCode: item.currencyCode,
        }))}
        icon="↗"
      />
      <DashboardMetric
        accent="pink"
        description={t('Average spend / day help')}
        title={t('Average spend / day')}
        units={units}
        values={displayed.overview.averageExpensePerDay}
        icon="÷"
      />
    </section>
  )
}
function DashboardMetric({
  accent,
  description,
  icon,
  title,
  units,
  values,
}: {
  accent: 'cyan' | 'blue' | 'green' | 'violet' | 'pink'
  description: string
  icon: React.ReactNode
  title: string
  units: Map<string, number>
  values: CurrencyAmount[]
}) {
  const { locale } = useLocalization()
  return (
    <KpiCard
      accent={accent}
      description={description}
      icon={icon}
      label={title}
      value={
        values.length === 0 ? (
          '—'
        ) : (
          <div className="metric-values">
            {values.map((item) => (
              <strong key={item.currencyCode}>
                {formatCurrencyAmount(
                  item.amountMinor,
                  item.currencyCode,
                  units.get(item.currencyCode) ?? 2,
                  locale,
                )}
              </strong>
            ))}
          </div>
        )
      }
    />
  )
}
