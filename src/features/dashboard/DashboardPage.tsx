import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { Card, ChartContainer, KpiCard } from '../../components/ui/Surfaces'
import { AccountSelector } from '../accounts/AccountSelector'
import {
  loadAccountFilter,
  saveAccountFilter,
  toggleAccountFilter,
  type AccountFilter,
} from '../accounts/account-filter-storage'
import { getAccounts, synchronizeAccounts } from '../accounts/accounts-api'
import type { AccountSummary } from '../accounts/account-types'
import { TransactionSyncStatus } from '../transactions/TransactionSyncStatus'
import {
  getTransactionSyncStatus,
  synchronizeTransactions,
} from '../transactions/transaction-sync-api'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'
import { getTransactions } from '../transactions/transactions-api'
import type {
  TransactionListFilters,
  TransactionListItem,
} from '../transactions/transaction-types'

import {
  getDashboardAnalytics,
  type CurrencyAmount,
  type CurrencyTotals,
} from './analytics-api'
import { getCurrencyPreferences } from '../settings/currency-preferences-api'
import {
  DEFAULT_DASHBOARD_DATE_PRESET,
  availableCurrencies,
  chartAccentIndex,
  chartSeries,
  filterDashboardAnalytics,
  formatCurrencyAmount,
  formatPeriod,
  resolveDashboardRange,
  type DashboardDatePreset,
} from './dashboard-data'

const DATE_PRESETS: Array<{ label: string; value: DashboardDatePreset }> = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Current month', value: 'current-month' },
  { label: 'Previous month', value: 'previous-month' },
  { label: 'Current year', value: 'current-year' },
  { label: 'Custom range', value: 'custom' },
]

type DashboardAnalytics = Awaited<ReturnType<typeof getDashboardAnalytics>>

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
  const [isTransactionSynchronizing, setIsTransactionSynchronizing] =
    useState(false)
  const [syncStates, setSyncStates] = useState<TransactionSyncState[] | null>(
    null,
  )
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AccountFilter>(loadBrowserAccountFilter)
  const [datePreset, setDatePreset] = useState<DashboardDatePreset>(
    DEFAULT_DASHBOARD_DATE_PRESET,
  )
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null)
  const [currencyMode, setCurrencyMode] = useState<'base' | 'original'>(
    'original',
  )
  const preferencesQuery = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: ['currency-preferences'],
  })
  const baseCurrencyCode = preferencesQuery.data?.baseCurrencyCode ?? 'UAH'
  const range = useMemo(
    () => resolveDashboardRange(datePreset, customDateFrom, customDateTo),
    [customDateFrom, customDateTo, datePreset],
  )
  const accountIds = useMemo(
    () => (filter.mode === 'selected' ? filter.accountIds : []),
    [filter],
  )
  const analyticsFilters = useMemo(
    () =>
      range === null
        ? null
        : {
            accountIds,
            ...(currencyMode === 'base' ? { baseCurrencyCode } : {}),
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
          },
    [accountIds, baseCurrencyCode, currencyMode, range],
  )
  const analyticsQuery = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () => getDashboardAnalytics(analyticsFilters!),
    queryKey: ['dashboard-analytics', analyticsFilters],
  })
  const recentFilters = useMemo<TransactionListFilters>(
    () => ({
      accountIds,
      category: null,
      currency: currencyMode === 'original' ? displayCurrency : null,
      dateFrom: range?.dateFrom ?? null,
      dateTo: range?.dateTo ?? null,
      direction: null,
      excluded: false,
      search: null,
    }),
    [accountIds, currencyMode, displayCurrency, range],
  )
  const recentQuery = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () => getTransactions(recentFilters, undefined, 100),
    queryKey: ['dashboard-recent', recentFilters],
  })

  useEffect(() => {
    let active = true
    void getAccounts()
      .then((loadedAccounts) => {
        if (active) setAccounts(loadedAccounts)
      })
      .catch(() => {
        if (active) setError('Accounts could not be loaded. Try again later.')
      })
    void getTransactionSyncStatus()
      .then((states) => {
        if (active) setSyncStates(states)
      })
      .catch(() => {
        if (active) {
          setSyncStatusError('Transaction sync status could not be loaded.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    saveBrowserAccountFilter(filter)
  }, [filter])

  async function handleAccountSynchronize() {
    setIsSynchronizing(true)
    setError(null)
    try {
      setAccounts(await synchronizeAccounts())
      await queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] })
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Accounts could not be synchronized. Try again later.',
      )
    } finally {
      setIsSynchronizing(false)
    }
  }

  async function handleTransactionSynchronize() {
    setIsTransactionSynchronizing(true)
    setSyncStatusError(null)
    try {
      await synchronizeTransactions()
      setSyncStates(await getTransactionSyncStatus())
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-recent'] }),
      ])
    } catch (syncError) {
      setSyncStatusError(
        syncError instanceof Error
          ? syncError.message
          : 'Transaction sync is unavailable. Try again later.',
      )
    } finally {
      setIsTransactionSynchronizing(false)
    }
  }

  return (
    <PageSurface className="dashboard-page">
      <PageHeader
        actions={
          <>
            <Button
              disabled={isSynchronizing || accounts === null}
              loading={isSynchronizing}
              onClick={() => void handleAccountSynchronize()}
              size="small"
              type="button"
              variant="secondary"
            >
              {isSynchronizing ? 'Syncing…' : 'Sync accounts'}
            </Button>
            <Button
              disabled={isTransactionSynchronizing || accounts === null}
              loading={isTransactionSynchronizing}
              onClick={() => void handleTransactionSynchronize()}
              size="small"
              type="button"
            >
              {isTransactionSynchronizing
                ? 'Refreshing…'
                : 'Refresh transactions'}
            </Button>
          </>
        }
        description={
          <p>
            Imported transactions, shaped by your adjustments and compensation
            links.
          </p>
        }
        eyebrow="Personal finance"
        id="dashboard-title"
        title="Your money, in clear focus."
      />

      {error === null ? null : (
        <Alert tone="danger" title="Accounts could not be synchronized">
          {error}
        </Alert>
      )}
      {syncStatusError === null ? null : (
        <Alert tone="danger" title="Transaction sync is unavailable">
          {syncStatusError}
        </Alert>
      )}

      <section className="dashboard-filters" aria-label="Dashboard filters">
        <FormField label="Period">
          <Select
            onChange={(event) =>
              setDatePreset(event.target.value as DashboardDatePreset)
            }
            value={datePreset}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </Select>
        </FormField>
        {datePreset === 'custom' ? (
          <>
            <FormField label="From">
              <input
                autoComplete="off"
                name="dashboard-from"
                onChange={(event) => setCustomDateFrom(event.target.value)}
                type="date"
                value={customDateFrom}
              />
            </FormField>
            <FormField label="To">
              <input
                autoComplete="off"
                name="dashboard-to"
                onChange={(event) => setCustomDateTo(event.target.value)}
                type="date"
                value={customDateTo}
              />
            </FormField>
          </>
        ) : null}
        <FormField label="Currency view">
          <Select
            onChange={(event) =>
              setCurrencyMode(event.target.value as 'base' | 'original')
            }
            value={currencyMode}
          >
            <option value="original">Original currencies</option>
            <option value="base">Base currency · {baseCurrencyCode}</option>
          </Select>
        </FormField>
        {currencyMode === 'original' ? (
          <FormField label="Original currency">
            <Select
              onChange={(event) =>
                setDisplayCurrency(event.target.value || null)
              }
              value={displayCurrency ?? ''}
            >
              <option value="">All original currencies</option>
              {analyticsQuery.data === undefined
                ? null
                : availableCurrencies(analyticsQuery.data).map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
            </Select>
          </FormField>
        ) : null}
      </section>

      {syncStates?.some((state) => state.status === 'failed') ? (
        <Alert tone="warning" title="Some accounts need attention">
          Some accounts still need a transaction sync retry. The dashboard shows
          transactions already stored in D1.
        </Alert>
      ) : null}

      {range === null ? (
        <Alert tone="danger" title="Date range is incomplete">
          Enter a valid start and end date to view analytics.
        </Alert>
      ) : null}
      {analyticsQuery.isPending ? <DashboardSkeleton /> : null}
      {analyticsQuery.isError ? (
        <DashboardError onRetry={() => void analyticsQuery.refetch()} />
      ) : null}
      {analyticsQuery.data === undefined || range === null ? null : (
        <DashboardAnalyticsView
          accounts={accounts ?? []}
          analytics={analyticsQuery.data}
          displayCurrency={currencyMode === 'original' ? displayCurrency : null}
          currencyMode={currencyMode}
          recentTransactions={recentQuery.data?.transactions ?? []}
          recentTransactionsLoading={recentQuery.isPending}
        />
      )}

      {accounts === null ? (
        <Skeleton label="Loading accounts…" lines={2} />
      ) : (
        <AccountSelector
          accounts={accounts}
          filter={filter}
          onSelectAll={() => setFilter({ mode: 'all' })}
          onToggle={(accountId) =>
            setFilter((current) => toggleAccountFilter(current, accountId))
          }
        />
      )}
      <TransactionSyncStatus states={syncStates} />
    </PageSurface>
  )
}

function DashboardAnalyticsView({
  accounts,
  analytics,
  currencyMode,
  displayCurrency,
  recentTransactions,
  recentTransactionsLoading,
}: {
  accounts: AccountSummary[]
  analytics: DashboardAnalytics
  currencyMode: 'base' | 'original'
  displayCurrency: string | null
  recentTransactions: TransactionListItem[]
  recentTransactionsLoading: boolean
}) {
  const currencies = availableCurrencies(analytics)
  const chartCurrency = displayCurrency ?? currencies[0] ?? null
  const displayed = filterDashboardAnalytics(analytics, displayCurrency)
  const chartData = filterDashboardAnalytics(analytics, chartCurrency)
  const minorUnits = new Map(
    accounts.map((account) => [
      account.currency.code,
      account.currency.minorUnit,
    ]),
  )
  const adjusted = recentTransactions
    .filter((transaction) => transaction.hasAdjustment)
    .slice(0, 5)
  const compensated = recentTransactions
    .filter((transaction) => transaction.hasCompensation)
    .slice(0, 5)
  if (displayed.overview.totals.length === 0) {
    return (
      <EmptyState title="No transactions in this view">
        <p>
          Change the filters or refresh transactions to build this dashboard.
        </p>
        {currencyMode === 'base' &&
        analytics.overview.currencyConversion.missingRateTransactionCounts
          .length > 0 ? (
          <p>
            Historical rates are missing for{' '}
            {analytics.overview.currencyConversion.missingRateTransactionCounts
              .map((item) => `${item.count} ${item.currencyCode}`)
              .join(', ')}{' '}
            transaction(s). Switch to original currencies to view them.
          </p>
        ) : null}
      </EmptyState>
    )
  }
  return (
    <div className="dashboard-content">
      {currencyMode === 'base' ? (
        <Alert tone="warning" title="Historical currency conversion">
          Base-currency values are converted from preserved original amounts
          using rates stored at or before each transaction.
          {analytics.overview.currencyConversion.missingRateTransactionCounts
            .length > 0
            ? ` ${analytics.overview.currencyConversion.missingRateTransactionCounts.map((item) => `${item.count} ${item.currencyCode}`).join(', ')} transaction(s) have no historical rate and are excluded from base totals.`
            : ''}
        </Alert>
      ) : null}
      <p className="dashboard-currency-note">
        {displayCurrency === null
          ? 'Totals remain separated by original currency. Choose a currency for a focused chart view.'
          : `Charts use ${displayCurrency}; no current-rate conversion is used.`}
      </p>
      <section className="kpi-grid" aria-label="Period summary">
        <MetricCard
          minorUnits={minorUnits}
          title="Total spent"
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.expenseAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <MetricCard
          minorUnits={minorUnits}
          title="Total income"
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.incomeAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <MetricCard
          minorUnits={minorUnits}
          title="Net cash flow"
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.netAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <MetricCard
          minorUnits={minorUnits}
          title="Available to save"
          values={displayed.overview.totals.map((item) => ({
            amountMinor: Math.max(0, item.netAmountMinor),
            currencyCode: item.currencyCode,
          }))}
        />
        <MetricCard
          minorUnits={minorUnits}
          title="Average spend / day"
          values={displayed.overview.averageExpensePerDay}
        />
        <MetricCard
          minorUnits={minorUnits}
          title="Previous period change"
          values={displayed.overview.comparison.map((item) => ({
            amountMinor: item.changeAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
      </section>
      <section className="dashboard-chart-grid">
        <ChartCard
          className="dashboard-chart-primary"
          title={`Expense timeline${chartCurrency === null ? '' : ` · ${chartCurrency}`}`}
        >
          <LineChart
            currencyCode={chartCurrency}
            minorUnit={minorUnits.get(chartCurrency ?? '') ?? 2}
            points={chartSeries(chartData.trends.daily, 'expenseAmountMinor')}
            title="Daily expenses"
          />
        </ChartCard>
        <ChartCard title="Income vs expense">
          <IncomeExpenseChart
            minorUnits={minorUnits}
            totals={displayed.overview.totals}
          />
        </ChartCard>
        <ChartCard title="Spending by category">
          <BarChart
            minorUnits={minorUnits}
            values={chartData.breakdowns.expensesByCategory.map((item) => ({
              ...item,
              label: item.categoryName,
            }))}
          />
        </ChartCard>
        <ChartCard title="Expense distribution">
          <DonutChart
            minorUnits={minorUnits}
            values={chartData.breakdowns.expensesByCategory}
          />
        </ChartCard>
        <ChartCard
          title={`Monthly trend${chartCurrency === null ? '' : ` · ${chartCurrency}`}`}
        >
          <LineChart
            currencyCode={chartCurrency}
            minorUnit={minorUnits.get(chartCurrency ?? '') ?? 2}
            points={chartSeries(chartData.trends.monthly, 'expenseAmountMinor')}
            title="Monthly expenses"
          />
        </ChartCard>
        <ChartCard title="Month-end forecast">
          <MetricValues
            empty="No current-month expenses yet."
            minorUnits={minorUnits}
            values={displayed.overview.projectedMonthExpenses}
          />
        </ChartCard>
        <ChartCard title="Account distribution">
          <BarChart
            minorUnits={minorUnits}
            values={chartData.breakdowns.expensesByAccount.map((item) => ({
              ...item,
              label: accountName(accounts, item.accountId),
            }))}
          />
        </ChartCard>
        <ChartCard title="Currency distribution">
          <BarChart
            minorUnits={minorUnits}
            values={analytics.breakdowns.expensesByCurrency.map((item) => ({
              ...item,
              label: item.currencyCode,
            }))}
          />
        </ChartCard>
      </section>
      <section className="dashboard-evidence-grid">
        <EvidenceList
          minorUnits={minorUnits}
          title="Top merchants"
          values={chartData.breakdowns.topMerchants.map((item) => ({
            ...item,
            detail: `${item.transactionCount} transaction${item.transactionCount === 1 ? '' : 's'}`,
            label: item.description,
          }))}
        />
        <EvidenceList
          minorUnits={minorUnits}
          title="Largest transactions"
          values={chartData.breakdowns.largestTransactions.map((item) => ({
            ...item,
            detail: formatPeriod(item.timestamp, 'day'),
            label: item.description,
          }))}
        />
        <TransactionEvidence
          empty="No adjusted transactions in this period."
          loading={recentTransactionsLoading}
          minorUnits={minorUnits}
          title="Recent adjusted transactions"
          transactions={adjusted}
        />
        <TransactionEvidence
          empty="No compensation links in this period."
          loading={recentTransactionsLoading}
          minorUnits={minorUnits}
          title="Recent compensations"
          transactions={compensated}
        />
      </section>
    </div>
  )
}

function DashboardSkeleton() {
  return <Skeleton label="Loading dashboard…" lines={6} />
}

function DashboardError({ onRetry }: { onRetry(): void }) {
  return (
    <Alert tone="danger" title="Analytics could not be loaded">
      <p>Check the connection, then try again.</p>
      <Button onClick={onRetry} size="small" type="button">
        Retry analytics
      </Button>
    </Alert>
  )
}

function MetricCard({
  minorUnits,
  title,
  values,
}: {
  minorUnits: Map<string, number>
  title: string
  values: CurrencyAmount[]
}) {
  return (
    <KpiCard
      accent={metricAccent(title)}
      label={title}
      value={<MetricValues empty="—" minorUnits={minorUnits} values={values} />}
    />
  )
}

function MetricValues({
  empty,
  minorUnits,
  values,
}: {
  empty: string
  minorUnits: Map<string, number>
  values: CurrencyAmount[]
}) {
  return values.length === 0 ? (
    <p className="metric-empty">{empty}</p>
  ) : (
    <div className="metric-values">
      {values.map((value) => (
        <strong key={value.currencyCode}>
          {formatCurrencyAmount(
            value.amountMinor,
            value.currencyCode,
            minorUnits.get(value.currencyCode) ?? 2,
          )}
        </strong>
      ))}
    </div>
  )
}

function ChartCard({
  children,
  className,
  title,
}: {
  children: ReactNode
  className?: string
  title: string
}) {
  return (
    <ChartContainer
      {...(className === undefined ? {} : { className })}
      summary={`${title} for the selected period. Exact values are available in the chart content.`}
      title={title}
    >
      {children}
    </ChartContainer>
  )
}

function LineChart({
  currencyCode,
  minorUnit,
  points,
  title,
}: {
  currencyCode: string | null
  minorUnit: number
  points: Array<{ periodStart: number; value: number }>
  title: string
}) {
  if (points.length === 0 || currencyCode === null) return <EmptyChart />
  const width = 640
  const height = 220
  const maximum = Math.max(...points.map((point) => point.value), 1)
  const position = (index: number) =>
    points.length === 1 ? width / 2 : (index / (points.length - 1)) * width
  const y = (value: number) => height - (value / maximum) * (height - 24)
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${position(index)} ${y(point.value)}`,
    )
    .join(' ')
  return (
    <div className="chart-wrap">
      <svg
        aria-label={title}
        className="line-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        <title>{title}</title>
        <path className="line-chart-grid" d={`M 0 ${height - 1} H ${width}`} />
        <path className="line-chart-path" d={path} />
        {points.map((point, index) => (
          <circle
            cx={position(index)}
            cy={y(point.value)}
            key={point.periodStart}
            r="4"
          >
            <title>{`${formatPeriod(point.periodStart, 'day')}: ${formatCurrencyAmount(point.value, currencyCode, minorUnit)}`}</title>
          </circle>
        ))}
      </svg>
      <details>
        <summary>View chart values</summary>
        <table>
          <tbody>
            {points.map((point) => (
              <tr key={point.periodStart}>
                <th scope="row">{formatPeriod(point.periodStart, 'day')}</th>
                <td>
                  {formatCurrencyAmount(point.value, currencyCode, minorUnit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

function IncomeExpenseChart({
  minorUnits,
  totals,
}: {
  minorUnits: Map<string, number>
  totals: CurrencyTotals[]
}) {
  if (totals.length === 0) return <EmptyChart />
  return (
    <div className="income-expense-chart">
      {totals.map((total) => {
        const maximum = Math.max(
          total.expenseAmountMinor,
          total.incomeAmountMinor,
          1,
        )
        return (
          <div className="income-expense-row" key={total.currencyCode}>
            <strong>{total.currencyCode}</strong>
            <div>
              <span
                className="income-bar"
                style={{
                  width: `${(total.incomeAmountMinor / maximum) * 100}%`,
                }}
                title={`Income: ${formatCurrencyAmount(total.incomeAmountMinor, total.currencyCode, minorUnits.get(total.currencyCode) ?? 2)}`}
              />
              <span
                className="expense-bar"
                style={{
                  width: `${(total.expenseAmountMinor / maximum) * 100}%`,
                }}
                title={`Expenses: ${formatCurrencyAmount(total.expenseAmountMinor, total.currencyCode, minorUnits.get(total.currencyCode) ?? 2)}`}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarChart({
  minorUnits,
  values,
}: {
  minorUnits: Map<string, number>
  values: Array<CurrencyAmount & { label: string }>
}) {
  if (values.length === 0) return <EmptyChart />
  const displayed = values.slice(0, 6)
  const maximum = Math.max(...displayed.map((value) => value.amountMinor), 1)
  return (
    <ol className="bar-chart">
      {displayed.map((value) => (
        <li key={`${value.label}-${value.currencyCode}`}>
          <span>{value.label}</span>
          <div>
            <i
              style={{ width: `${(value.amountMinor / maximum) * 100}%` }}
              title={formatCurrencyAmount(
                value.amountMinor,
                value.currencyCode,
                minorUnits.get(value.currencyCode) ?? 2,
              )}
            />
          </div>
          <strong>
            {formatCurrencyAmount(
              value.amountMinor,
              value.currencyCode,
              minorUnits.get(value.currencyCode) ?? 2,
            )}
          </strong>
        </li>
      ))}
    </ol>
  )
}

function DonutChart({
  minorUnits,
  values,
}: {
  minorUnits: Map<string, number>
  values: Array<CurrencyAmount & { categoryName: string }>
}) {
  if (values.length === 0) return <EmptyChart />
  const displayed =
    values.length <= 5
      ? values
      : values.slice(0, 4).concat({
          amountMinor: values
            .slice(4)
            .reduce((sum, value) => sum + value.amountMinor, 0),
          categoryName: 'Other',
          currencyCode: values[0]?.currencyCode ?? '',
        })
  const total = displayed.reduce((sum, value) => sum + value.amountMinor, 0)
  const segments = displayed.reduce<
    Array<{ offset: number; value: (typeof displayed)[number] }>
  >((current, value) => {
    const previous = current.at(-1)
    return current.concat({
      offset:
        previous === undefined
          ? 0
          : previous.offset + (previous.value.amountMinor / total) * 100,
      value,
    })
  }, [])
  return (
    <div className="donut-layout">
      <svg
        aria-label="Expense distribution by category"
        className="donut-chart"
        role="img"
        viewBox="0 0 42 42"
      >
        <title>Expense distribution by category</title>
        {segments.map(({ offset, value }) => {
          const accentIndex = chartAccentIndex(
            `${value.categoryName}:${value.currencyCode}`,
          )
          return (
            <circle
              className={`donut-segment donut-segment-${accentIndex}`}
              cx="21"
              cy="21"
              fill="transparent"
              key={`${value.categoryName}-${value.currencyCode}`}
              r="15.9155"
              strokeDasharray={`${(value.amountMinor / total) * 100} ${100 - (value.amountMinor / total) * 100}`}
              strokeDashoffset={-offset}
            />
          )
        })}
      </svg>
      <ol className="donut-legend">
        {displayed.map((value) => (
          <li key={`${value.categoryName}-${value.currencyCode}`}>
            <span>
              <i
                aria-hidden="true"
                className={`donut-legend-marker donut-segment-${chartAccentIndex(`${value.categoryName}:${value.currencyCode}`)}`}
              />
              {value.categoryName}
            </span>
            <strong>
              {formatCurrencyAmount(
                value.amountMinor,
                value.currencyCode,
                minorUnits.get(value.currencyCode) ?? 2,
              )}
            </strong>
          </li>
        ))}
      </ol>
    </div>
  )
}

function EvidenceList({
  minorUnits,
  title,
  values,
}: {
  minorUnits: Map<string, number>
  title: string
  values: Array<CurrencyAmount & { detail: string; label: string }>
}) {
  return (
    <Card className="evidence-card" title={title}>
      {values.length === 0 ? (
        <p className="metric-empty">No data in this period.</p>
      ) : (
        <ol className="evidence-list">
          {values.slice(0, 5).map((value) => (
            <li key={`${value.label}-${value.currencyCode}`}>
              <span>
                <strong>{value.label}</strong>
                <small>{value.detail}</small>
              </span>
              <b>
                {formatCurrencyAmount(
                  value.amountMinor,
                  value.currencyCode,
                  minorUnits.get(value.currencyCode) ?? 2,
                )}
              </b>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function TransactionEvidence({
  empty,
  loading,
  minorUnits,
  title,
  transactions,
}: {
  empty: string
  loading: boolean
  minorUnits: Map<string, number>
  title: string
  transactions: TransactionListItem[]
}) {
  return (
    <Card className="evidence-card" title={title}>
      {loading ? (
        <p className="metric-empty">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="metric-empty">{empty}</p>
      ) : (
        <ol className="evidence-list">
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <span>
                <strong>{transaction.originalDescription}</strong>
                <small>
                  {formatPeriod(transaction.originalTimestamp, 'day')}
                </small>
              </span>
              <b>
                {formatCurrencyAmount(
                  transaction.effectiveAmountMinor,
                  transaction.currencyCode,
                  minorUnits.get(transaction.currencyCode) ??
                    transaction.currencyMinorUnit,
                )}
              </b>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

function EmptyChart() {
  return <p className="chart-empty">No data in this period.</p>
}

function metricAccent(
  title: string,
): 'cyan' | 'blue' | 'green' | 'violet' | 'pink' {
  const accents = ['cyan', 'blue', 'green', 'violet', 'pink'] as const
  const titles = [
    'Total spent',
    'Total income',
    'Net cash flow',
    'Available to save',
    'Average spend / day',
  ]
  const index = titles.indexOf(title)
  return accents[index < 0 ? 0 : index % accents.length] ?? 'cyan'
}
function accountName(accounts: AccountSummary[], accountId: string): string {
  const account = accounts.find((item) => item.id === accountId)
  return account === undefined
    ? 'Account'
    : `${account.type.charAt(0).toUpperCase()}${account.type.slice(1)} ${account.currency.code}`
}
function loadBrowserAccountFilter(): AccountFilter {
  try {
    return loadAccountFilter(window.localStorage)
  } catch {
    return { mode: 'all' }
  }
}
function saveBrowserAccountFilter(filter: AccountFilter): void {
  try {
    saveAccountFilter(window.localStorage, filter)
  } catch {
    /* Keep the in-memory selection when storage is unavailable. */
  }
}
