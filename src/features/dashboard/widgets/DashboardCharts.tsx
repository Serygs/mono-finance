import { useLocalization } from '../../localization/localization'
import {
  ChartPoint,
  ChartScale,
  ChartDataTable,
} from '../../../components/ui/ChartPrimitives'
import type { CurrencyAmount, TimeSeriesPoint } from '../analytics-api'
import {
  chartAccentIndex,
  formatCurrencyAmount,
  groupTimeSeriesIntoBuckets,
  groupedIncomeExpenseValues,
} from '../dashboard-data'
import {
  fullChartPeriod,
  minorRatioPercent,
  shortChartDate,
} from '../dashboard-chart-presentation'
import { DashboardEmptyState } from '../DashboardEmptyState'
import type { CustomCategory } from '../../categories/categories-api'
import { resolveCategoryAppearance } from '../../categories/category-appearance'

type SeriesProps = {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}

export function IncomeExpenseChart({ currency, points, units }: SeriesProps) {
  const { locale, t } = useLocalization()
  if (currency === null || points.length === 0) return <DashboardEmptyState />
  const buckets = groupTimeSeriesIntoBuckets(points)
  const { maximum, values } = groupedIncomeExpenseValues(buckets)
  if (maximum === 0) return <DashboardEmptyState />
  const money = (amount: number | bigint) =>
    formatCurrencyAmount(amount, currency, units.get(currency) ?? 2, locale)
  return (
    <div className="income-expense-vertical">
      <div
        className="income-expense-legend"
        aria-label={t('Income vs expenses')}
      >
        <span>
          <i className="income-bar" />
          {t('Income')}
        </span>
        <span>
          <i className="expense-bar" />
          {t('Expenses')}
        </span>
      </div>
      <ChartScale label={t('Scale')} zero={money(0)} maximum={money(maximum)} />
      <div
        className="income-expense-plot"
        style={{
          gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
        }}
      >
        {buckets.map((item, index) => {
          const visual = values[index]!
          const period = fullChartPeriod(
            item.periodStart,
            item.periodEnd,
            locale,
          )
          const details = [
            { label: t('Income'), value: money(item.incomeAmountMinor) },
            { label: t('Expenses'), value: money(item.expenseAmountMinor) },
            { label: t('Net cash flow'), value: money(item.netAmountMinor) },
          ]
          return (
            <div key={item.periodStart}>
              <ChartPoint
                title={period}
                label={`${period}. ${details.map((entry) => `${entry.label}: ${entry.value}`).join('. ')}`}
                details={details}
              >
                <span className="income-expense-bars" aria-hidden="true">
                  <span
                    className="income-bar"
                    style={{
                      height: `${minorRatioPercent(visual.incomeMagnitude, maximum)}%`,
                      minHeight: visual.incomeMagnitude > 0 ? 2 : 0,
                    }}
                  />
                  <span
                    className="expense-bar"
                    style={{
                      height: `${minorRatioPercent(visual.expenseMagnitude, maximum)}%`,
                      minHeight: visual.expenseMagnitude > 0 ? 2 : 0,
                    }}
                  />
                </span>
              </ChartPoint>
              <small>{shortChartDate(item.periodStart, locale)}</small>
            </div>
          )
        })}
      </div>
      <ChartDataTable
        label={t('Chart details')}
        rows={buckets.map((item) => ({
          title: fullChartPeriod(item.periodStart, item.periodEnd, locale),
          details: [
            { label: t('Income'), value: money(item.incomeAmountMinor) },
            { label: t('Expenses'), value: money(item.expenseAmountMinor) },
            { label: t('Net cash flow'), value: money(item.netAmountMinor) },
          ],
        }))}
      />
    </div>
  )
}

export function SpendingTrendChart({ currency, points, units }: SeriesProps) {
  const { locale, t } = useLocalization()
  if (
    currency === null ||
    points.length === 0 ||
    points.every((item) => item.expenseAmountMinor === 0)
  )
    return <DashboardEmptyState message="No expenses in this period." />
  const buckets = groupTimeSeriesIntoBuckets(points)
  const max = Math.max(
    ...buckets.map((item) => Math.abs(item.expenseAmountMinor)),
    1,
  )
  const money = (amount: number | bigint) =>
    formatCurrencyAmount(amount, currency, units.get(currency) ?? 2, locale)
  const x = (index: number) =>
    buckets.length === 1 ? 50 : 4 + (index / (buckets.length - 1)) * 92
  const y = (amount: number) =>
    95 - parseFloat(minorRatioPercent(amount, max)) * 0.85
  const path = buckets
    .map(
      (item, index) =>
        `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(item.expenseAmountMinor)}`,
    )
    .join(' ')
  return (
    <div className="dashboard-trend">
      <ChartScale label={t('Scale')} zero={money(0)} maximum={money(max)} />
      <div className="dashboard-trend-plot">
        <svg
          aria-hidden="true"
          className="line-chart"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <path
            className="line-chart-area"
            d={`${path} L ${x(buckets.length - 1)} 95 L ${x(0)} 95 Z`}
          />
          <path
            className="line-chart-path"
            d={path}
            vectorEffect="non-scaling-stroke"
          />
          {buckets.map((item, index) => (
            <circle
              key={item.periodStart}
              cx={x(index)}
              cy={y(item.expenseAmountMinor)}
              r="1.2"
            />
          ))}
        </svg>
        <div
          className="dashboard-trend-points"
          style={{
            gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
          }}
        >
          {buckets.map((item) => {
            const period = fullChartPeriod(
              item.periodStart,
              item.periodEnd,
              locale,
            )
            const amount = money(Math.abs(item.expenseAmountMinor))
            return (
              <ChartPoint
                key={item.periodStart}
                title={period}
                label={`${period}. ${t('Expenses')}: ${amount}`}
                details={[{ label: t('Expenses'), value: amount }]}
              >
                <span aria-hidden="true" />
              </ChartPoint>
            )
          })}
        </div>
      </div>
      <div
        className="dashboard-trend-labels"
        style={{
          gridTemplateColumns: `repeat(${buckets.length}, minmax(0, 1fr))`,
        }}
      >
        {buckets.map((item) => (
          <span key={item.periodStart}>
            {shortChartDate(item.periodStart, locale)}
          </span>
        ))}
      </div>
      <ChartDataTable
        label={t('Chart details')}
        rows={buckets.map((item) => ({
          title: fullChartPeriod(item.periodStart, item.periodEnd, locale),
          details: [
            {
              label: t('Expenses'),
              value: money(Math.abs(item.expenseAmountMinor)),
            },
          ],
        }))}
      />
    </div>
  )
}

export function CategoryRankingChart({
  units,
  values,
  other,
  totals = values,
  customCategories = [],
  percentageLabel = '{percent}% of category spending',
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { label: string; categoryId?: string | null }>
  other?: (CurrencyAmount & { label: string }) | undefined
  totals?: CurrencyAmount[]
  customCategories?: CustomCategory[]
  percentageLabel?:
    '{percent}% of category spending' | '{percent}% of period expenses'
}) {
  const { locale, t } = useLocalization()
  if (values.length === 0 || values.every((item) => item.amountMinor === 0))
    return <DashboardEmptyState message="No expenses in this period." />
  const max = Math.max(...values.map((item) => Math.abs(item.amountMinor)), 1)
  const total = totals.reduce(
    (sum, item) => sum + BigInt(Math.abs(item.amountMinor)),
    0n,
  )
  function row(
    item: CurrencyAmount & { label: string; categoryId?: string | null },
    aggregated = false,
  ) {
    const appearance = resolveCategoryAppearance(
      customCategories.find((category) => category.id === item.categoryId),
    )
    const percent = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    }).format(parseFloat(minorRatioPercent(item.amountMinor, total)))
    return (
      <li
        key={`${item.label}-${item.currencyCode}`}
        className={aggregated ? 'dashboard-category-other' : undefined}
      >
        <div className="dashboard-category-label">
          <span>{item.label}</span>
          <strong>
            {formatCurrencyAmount(
              item.amountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
              locale,
            )}
          </strong>
        </div>
        {aggregated ? null : (
          <div className="dashboard-rank-track" aria-hidden="true">
            <i
              className={`dashboard-rank-bar ${appearance.colorToken === null ? `dashboard-rank-bar--${chartAccentIndex(item.label)}` : `ui-visual--${appearance.colorToken}`}`}
              style={{ width: `${minorRatioPercent(item.amountMinor, max)}%` }}
            />
          </div>
        )}
        <small>{t(percentageLabel, { percent })}</small>
      </li>
    )
  }
  return (
    <ol className="bar-chart">
      {values.map((item) => row(item))}
      {other === undefined ? null : row(other, true)}
    </ol>
  )
}

export function WeekdaySpendingChart({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { transactionCount: number; weekday: number }>
}) {
  const { locale, t } = useLocalization()
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
  const fullLabels = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ] as const
  const expenses = values.map((item) => ({
    ...item,
    amountMinor: Math.abs(item.amountMinor),
  }))
  if (expenses.length === 0 || expenses.every((item) => item.amountMinor === 0))
    return <DashboardEmptyState message="No expenses in this period." />
  const max = Math.max(...expenses.map((item) => item.amountMinor), 1)
  const currency = expenses[0]!.currencyCode
  const money = (amount: number) =>
    formatCurrencyAmount(amount, currency, units.get(currency) ?? 2, locale)
  return (
    <div className="dashboard-weekday">
      <ChartScale label={t('Scale')} zero={money(0)} maximum={money(max)} />
      <div className="weekday-vertical-chart">
        {labels.map((label, index) => {
          const value = expenses.find((item) => item.weekday === index + 1)
          const amount = money(value?.amountMinor ?? 0)
          const weekday = t(fullLabels[index]!)
          const count = value?.transactionCount ?? 0
          return (
            <div key={label}>
              <ChartPoint
                title={weekday}
                label={t('Weekday {weekday}: {amount}. {count} transactions.', {
                  amount,
                  count,
                  weekday,
                })}
                details={[
                  { label: t('Expenses'), value: amount },
                  {
                    label: t('Transactions'),
                    value: new Intl.NumberFormat(locale).format(count),
                  },
                ]}
              >
                <span className="weekday-bars" aria-hidden="true">
                  <span
                    style={{
                      height: `${minorRatioPercent(value?.amountMinor ?? 0, max)}%`,
                      minHeight: (value?.amountMinor ?? 0) > 0 ? 2 : 0,
                    }}
                  />
                </span>
              </ChartPoint>
              <small>{t(label)}</small>
            </div>
          )
        })}
      </div>
      <ChartDataTable
        label={t('Chart details')}
        rows={labels.map((_, index) => {
          const item = expenses.find((value) => value.weekday === index + 1)
          return {
            title: t(fullLabels[index]!),
            details: [
              { label: t('Expenses'), value: money(item?.amountMinor ?? 0) },
              {
                label: t('Transactions'),
                value: new Intl.NumberFormat(locale).format(
                  item?.transactionCount ?? 0,
                ),
              },
            ],
          }
        })}
      />
    </div>
  )
}
