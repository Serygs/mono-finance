import {
  useLocalization,
  type TranslationKey,
} from '../../localization/localization'
import type { CurrencyAmount, TimeSeriesPoint } from '../analytics-api'
import {
  chartAccentIndex,
  formatCurrencyAmount,
  formatPeriodRange,
  groupTimeSeriesIntoBuckets,
  groupedIncomeExpenseValues,
} from '../dashboard-data'
import { DashboardEmptyState } from '../DashboardEmptyState'

export function IncomeExpenseChart({
  currency,
  points,
  units,
}: {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}) {
  const { locale, t } = useLocalization()
  if (currency === null || points.length === 0) return <DashboardEmptyState />
  const buckets = groupTimeSeriesIntoBuckets(points)
  const { maximum, values } = groupedIncomeExpenseValues(buckets)
  if (maximum === 0) return <DashboardEmptyState />
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
      <div className="income-expense-plot">
        {buckets.map((item, index) => {
          const visualValue = values[index]
          if (visualValue === undefined) return null
          const period = formatPeriodRange(
            item.periodStart,
            item.periodEnd,
            locale,
          )
          const income = formatCurrencyAmount(
            item.incomeAmountMinor,
            currency,
            units.get(currency) ?? 2,
            locale,
          )
          const expense = formatCurrencyAmount(
            item.expenseAmountMinor,
            currency,
            units.get(currency) ?? 2,
            locale,
          )
          const net = formatCurrencyAmount(
            item.netAmountMinor,
            currency,
            units.get(currency) ?? 2,
            locale,
          )
          const summary = `${period}\n${t('Income')}: ${income}\n${t('Expenses')}: ${expense}\n${t('Net cash flow')}: ${net}`
          return (
            <div key={item.periodStart}>
              <div className="income-expense-bars" title={summary}>
                <span
                  className="income-bar"
                  style={{
                    height: `${(visualValue.incomeMagnitude / maximum) * 100}%`,
                  }}
                />
                <span
                  className="expense-bar"
                  style={{
                    height: `${(visualValue.expenseMagnitude / maximum) * 100}%`,
                  }}
                />
              </div>
              <small>{period}</small>
              <span className="sr-only">{summary}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
export function SpendingTrendChart({
  currency,
  points,
  units,
}: {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}) {
  const { locale, t } = useLocalization()
  if (currency === null || points.length === 0) return <DashboardEmptyState />
  const usefulPoints = points.filter(
    (point) => Math.abs(point.expenseAmountMinor) > 0,
  )
  if (points.length < 3 || usefulPoints.length < 3)
    return <DashboardEmptyState message="Not enough data in this period." />
  const buckets = groupTimeSeriesIntoBuckets(points, 8)
  const max = Math.max(
    ...buckets.map((item) => Math.abs(item.expenseAmountMinor)),
    1,
  )
  const path = buckets
    .map(
      (item, index) =>
        `${index === 0 ? 'M' : 'L'} ${20 + (index / Math.max(buckets.length - 1, 1)) * 680} ${250 - (Math.abs(item.expenseAmountMinor) / max) * 200}`,
    )
    .join(' ')
  const areaPath = `${path} L 700 260 L 20 260 Z`
  return (
    <svg
      aria-label={t('Spending trend')}
      className="line-chart"
      role="img"
      viewBox="0 0 720 300"
    >
      <defs>
        <linearGradient id="spending-trend-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--chart-expense)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--chart-expense)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g aria-hidden="true" className="line-chart-grid">
        {[50, 100, 150, 200, 250].map((position) => (
          <line key={position} x1="20" x2="700" y1={position} y2={position} />
        ))}
      </g>
      <path className="line-chart-area" d={areaPath} />
      <path className="line-chart-path" d={path} />
      {buckets.map((item, index) => {
        const amount = formatCurrencyAmount(
          Math.abs(item.expenseAmountMinor),
          currency,
          units.get(currency) ?? 2,
          locale,
        )
        return (
          <g key={item.periodStart}>
            <circle
              cx={20 + (index / Math.max(buckets.length - 1, 1)) * 680}
              cy={250 - (Math.abs(item.expenseAmountMinor) / max) * 200}
              r="4"
            >
              <title>{`${formatPeriodRange(item.periodStart, item.periodEnd, locale)}: ${amount}`}</title>
            </circle>
            <text
              className="line-chart-axis-label"
              textAnchor={
                index === 0
                  ? 'start'
                  : index === buckets.length - 1
                    ? 'end'
                    : 'middle'
              }
              x={20 + (index / Math.max(buckets.length - 1, 1)) * 680}
              y="286"
            >
              {formatPeriodRange(item.periodStart, item.periodEnd, locale)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
export function CategoryRankingChart({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { label: string }>
}) {
  const { locale } = useLocalization()
  if (values.length === 0) return <DashboardEmptyState />
  const max = Math.max(...values.map((item) => item.amountMinor), 1)
  return (
    <ol className="bar-chart">
      {values.map((item) => (
        <li key={`${item.label}-${item.currencyCode}`}>
          <span>{item.label}</span>
          <div>
            <i
              className={`dashboard-rank-bar dashboard-rank-bar--${chartAccentIndex(item.label)}`}
              style={{ width: `${(item.amountMinor / max) * 100}%` }}
            />
          </div>
          <strong>
            {formatCurrencyAmount(
              item.amountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
              locale,
            )}
          </strong>
        </li>
      ))}
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
  const labels: TranslationKey[] = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ]
  const expenses = values.map((item) => ({
    ...item,
    amountMinor: Math.abs(item.amountMinor),
  }))
  if (expenses.length === 0 || expenses.every((item) => item.amountMinor === 0))
    return <p className="chart-empty">{t('No expenses in this period.')}</p>
  const max = Math.max(...expenses.map((item) => item.amountMinor), 1)
  return (
    <div
      className="weekday-vertical-chart"
      role="img"
      aria-label={t('Spending by weekday')}
    >
      {labels.map((label, index) => {
        const value = expenses.find((item) => item.weekday === index + 1)
        const amountMinor = value?.amountMinor ?? 0
        const currencyCode =
          value?.currencyCode ?? expenses[0]?.currencyCode ?? 'UAH'
        const transactionCount = value?.transactionCount ?? 0
        const amount = formatCurrencyAmount(
          amountMinor,
          currencyCode,
          units.get(currencyCode) ?? 2,
          locale,
        )
        return (
          <div key={label}>
            <span
              style={{ height: `${(amountMinor / max) * 100}%` }}
              title={t('Weekday {weekday}: {amount}. {count} transactions.', {
                amount,
                count: transactionCount,
                weekday: t(label),
              })}
            />
            <small>{t(label)}</small>
            <span className="sr-only">
              {t('Weekday {weekday}: {amount}. {count} transactions.', {
                amount,
                count: transactionCount,
                weekday: t(label),
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
