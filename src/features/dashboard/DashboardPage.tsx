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
import { useLocalization } from '../localization/localization'
import {
  DEFAULT_DASHBOARD_DATE_PRESET,
  availableCurrencies,
  chartAccentIndex,
  chartSeries,
  displayExpenseCategories,
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
  const { t } = useLocalization()
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
  const selectedPeriodLabel = t(
    DATE_PRESETS.find((preset) => preset.value === datePreset)?.label ??
      'Custom range',
  )

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
              {t(isSynchronizing ? 'Syncing…' : 'Sync accounts')}
            </Button>
            <Button
              disabled={isTransactionSynchronizing || accounts === null}
              loading={isTransactionSynchronizing}
              onClick={() => void handleTransactionSynchronize()}
              size="small"
              type="button"
            >
              {isTransactionSynchronizing
                ? t('Refreshing…')
                : t('Refresh transactions')}
            </Button>
          </>
        }
        description={<p>{selectedPeriodLabel}</p>}
        id="dashboard-title"
        title={t('Finance overview')}
      />

      {error === null ? null : (
        <Alert tone="danger" title={t('Accounts could not be synchronized')}>
          {error}
        </Alert>
      )}
      {syncStatusError === null ? null : (
        <Alert tone="danger" title={t('Transaction sync is unavailable')}>
          {syncStatusError}
        </Alert>
      )}
      {analyticsQuery.data === undefined || range === null ? null : (
        <DashboardPrimaryKpis
          accounts={accounts ?? []}
          analytics={analyticsQuery.data}
          displayCurrency={currencyMode === 'original' ? displayCurrency : null}
        />
      )}

      <section
        className="dashboard-filters"
        aria-label={t('Dashboard filters')}
      >
        <FormField label={t('Period')}>
          <Select
            onChange={(event) =>
              setDatePreset(event.target.value as DashboardDatePreset)
            }
            value={datePreset}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {t(preset.label)}
              </option>
            ))}
          </Select>
        </FormField>
        {datePreset === 'custom' ? (
          <>
            <FormField label={t('From')}>
              <input
                autoComplete="off"
                name="dashboard-from"
                onChange={(event) => setCustomDateFrom(event.target.value)}
                type="date"
                value={customDateFrom}
              />
            </FormField>
            <FormField label={t('To')}>
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
        <FormField label={t('Currency view')}>
          <Select
            onChange={(event) =>
              setCurrencyMode(event.target.value as 'base' | 'original')
            }
            value={currencyMode}
          >
            <option value="original">{t('Original currencies')}</option>
            <option value="base">
              {t('Base currency')} · {baseCurrencyCode}
            </option>
          </Select>
        </FormField>
        {currencyMode === 'original' ? (
          <FormField label={t('Original currency')}>
            <Select
              onChange={(event) =>
                setDisplayCurrency(event.target.value || null)
              }
              value={displayCurrency ?? ''}
            >
              <option value="">{t('All original currencies')}</option>
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
        <Alert tone="warning" title={t('Some accounts need attention')}>
          {t(
            'Some accounts still need a transaction sync retry. The dashboard shows transactions already stored in D1.',
          )}
        </Alert>
      ) : null}

      {range === null ? (
        <Alert tone="danger" title={t('Date range is incomplete')}>
          {t('Enter a valid start and end date to view analytics.')}
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
        <Skeleton label={t('Loading accounts…')} lines={2} />
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

function DashboardPrimaryKpis({
  accounts,
  analytics,
  displayCurrency,
}: {
  accounts: AccountSummary[]
  analytics: DashboardAnalytics
  displayCurrency: string | null
}) {
  const { t } = useLocalization()
  const displayed = filterDashboardAnalytics(analytics, displayCurrency)
  const minorUnits = new Map(
    accounts.map((account) => [
      account.currency.code,
      account.currency.minorUnit,
    ]),
  )

  if (displayed.overview.totals.length === 0) return null

  return (
    <section
      className="kpi-grid dashboard-primary-kpis"
      aria-label={t('Period summary')}
    >
      <MetricCard
        accent="cyan"
        minorUnits={minorUnits}
        title={t('Total spent')}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.expenseAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
      <MetricCard
        accent="blue"
        minorUnits={minorUnits}
        title={t('Total income')}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.incomeAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
      <MetricCard
        accent="green"
        minorUnits={minorUnits}
        title={t('Net cash flow')}
        values={displayed.overview.totals.map((item) => ({
          amountMinor: item.netAmountMinor,
          currencyCode: item.currencyCode,
        }))}
      />
    </section>
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
  const { t } = useLocalization()
  const [categoriesExpanded, setCategoriesExpanded] = useState(false)
  const currencies = availableCurrencies(analytics)
  const chartCurrency = displayCurrency ?? currencies[0] ?? null
  const displayed = filterDashboardAnalytics(analytics, displayCurrency)
  const chartData = filterDashboardAnalytics(analytics, chartCurrency)
  const categoryValues = chartData.breakdowns.expensesByCategory
  const categoryDisplay = displayExpenseCategories(categoryValues, t('Other'))
  const displayedCategoryValues = categoriesExpanded
    ? categoryDisplay.all
    : categoryDisplay.initial
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
      <EmptyState title={t('No transactions in this view')}>
        <p>
          {t(
            'Change the filters or refresh transactions to build this dashboard.',
          )}
        </p>
        {currencyMode === 'base' &&
        analytics.overview.currencyConversion.missingRateTransactionCounts
          .length > 0 ? (
          <p>
            {t(
              'Historical rates are missing for {currencies}. Switch to original currencies to view them.',
              {
                currencies:
                  analytics.overview.currencyConversion.missingRateTransactionCounts
                    .map((item) => `${item.count} ${item.currencyCode}`)
                    .join(', '),
              },
            )}
          </p>
        ) : null}
      </EmptyState>
    )
  }
  return (
    <div className="dashboard-content">
      {currencyMode === 'base' ? (
        <Alert tone="warning" title={t('Historical currency conversion')}>
          {t(
            'Base-currency values are converted from preserved original amounts using rates stored at or before each transaction.',
          )}
          {analytics.overview.currencyConversion.missingRateTransactionCounts
            .length > 0
            ? ` ${t('{currencies} transactions have no historical rate and are excluded from base totals.', { currencies: analytics.overview.currencyConversion.missingRateTransactionCounts.map((item) => `${item.count} ${item.currencyCode}`).join(', ') })}`
            : ''}
        </Alert>
      ) : null}
      <p className="dashboard-currency-note">
        {displayCurrency === null
          ? t(
              'Totals remain separated by original currency. Choose a currency for a focused chart view.',
            )
          : t('Charts use {currency}; no current-rate conversion is used.', {
              currency: displayCurrency,
            })}
      </p>
      <section
        className="kpi-grid dashboard-secondary-kpis"
        aria-label={t('Period summary')}
      >
        <MetricCard
          accent="violet"
          minorUnits={minorUnits}
          title={t('Available to save')}
          values={displayed.overview.totals.map((item) => ({
            amountMinor: Math.max(0, item.netAmountMinor),
            currencyCode: item.currencyCode,
          }))}
        />
        <MetricCard
          accent="pink"
          minorUnits={minorUnits}
          title={t('Average spend / day')}
          values={displayed.overview.averageExpensePerDay}
        />
        <MetricCard
          accent="cyan"
          minorUnits={minorUnits}
          title={t('Previous period change')}
          values={displayed.overview.comparison.map((item) => ({
            amountMinor: item.changeAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
      </section>
      <section className="dashboard-chart-grid">
        <ChartCard
          className="dashboard-chart-primary"
          title={`${t('Expense timeline')}${chartCurrency === null ? '' : ` · ${chartCurrency}`}`}
        >
          <LineChart
            currencyCode={chartCurrency}
            minorUnit={minorUnits.get(chartCurrency ?? '') ?? 2}
            points={chartSeries(chartData.trends.daily, 'expenseAmountMinor')}
            title={t('Daily expenses')}
          />
        </ChartCard>
        <ChartCard title={t('Income vs expense')}>
          <IncomeExpenseChart
            minorUnits={minorUnits}
            totals={displayed.overview.totals}
          />
        </ChartCard>
        <ChartCard
          className="dashboard-chart-primary"
          title={t('Spending by category')}
        >
          <BarChart
            className="category-bar-chart"
            minorUnits={minorUnits}
            values={displayedCategoryValues.map((item) => ({
              ...item,
              label: item.categoryName,
            }))}
          />
          {categoryDisplay.all.length > 5 ? (
            <div className="category-chart-actions">
              <Button
                aria-expanded={categoriesExpanded}
                onClick={() => setCategoriesExpanded((expanded) => !expanded)}
                size="small"
                type="button"
                variant="quiet"
              >
                {t(categoriesExpanded ? 'Show less' : 'Show all')}
              </Button>
            </div>
          ) : null}
        </ChartCard>
        <ChartCard title={t('Expense distribution')}>
          <DonutChart minorUnits={minorUnits} values={categoryValues} />
        </ChartCard>
        <ChartCard
          title={`${t('Monthly trend')}${chartCurrency === null ? '' : ` · ${chartCurrency}`}`}
        >
          <LineChart
            currencyCode={chartCurrency}
            minorUnit={minorUnits.get(chartCurrency ?? '') ?? 2}
            points={chartSeries(chartData.trends.monthly, 'expenseAmountMinor')}
            title={t('Monthly expenses')}
          />
        </ChartCard>
        <ChartCard title={t('Month-end forecast')}>
          <MetricValues
            empty={t('No current-month expenses yet.')}
            minorUnits={minorUnits}
            values={displayed.overview.projectedMonthExpenses}
          />
        </ChartCard>
        <ChartCard title={t('Account distribution')}>
          <BarChart
            minorUnits={minorUnits}
            values={chartData.breakdowns.expensesByAccount.map((item) => ({
              ...item,
              label: accountName(accounts, item.accountId),
            }))}
          />
        </ChartCard>
        <ChartCard title={t('Currency distribution')}>
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
          title={t('Top merchants')}
          values={chartData.breakdowns.topMerchants.map((item) => ({
            ...item,
            detail: t('{count} transactions', { count: item.transactionCount }),
            label: item.description,
          }))}
        />
        <EvidenceList
          minorUnits={minorUnits}
          title={t('Largest transactions')}
          values={chartData.breakdowns.largestTransactions.map((item) => ({
            ...item,
            detail: formatPeriod(item.timestamp, 'day'),
            label: item.description,
          }))}
        />
        <TransactionEvidence
          empty={t('No adjusted transactions in this period.')}
          loading={recentTransactionsLoading}
          minorUnits={minorUnits}
          title={t('Recent adjusted transactions')}
          transactions={adjusted}
        />
        <TransactionEvidence
          empty={t('No compensation links in this period.')}
          loading={recentTransactionsLoading}
          minorUnits={minorUnits}
          title={t('Recent compensations')}
          transactions={compensated}
        />
      </section>
    </div>
  )
}

function DashboardSkeleton() {
  const { t } = useLocalization()
  return <Skeleton label={t('Loading dashboard…')} lines={6} />
}

function DashboardError({ onRetry }: { onRetry(): void }) {
  const { t } = useLocalization()
  return (
    <Alert tone="danger" title={t('Analytics could not be loaded')}>
      <p>{t('Check the connection, then try again.')}</p>
      <Button onClick={onRetry} size="small" type="button">
        {t('Retry analytics')}
      </Button>
    </Alert>
  )
}

function MetricCard({
  accent,
  minorUnits,
  title,
  values,
}: {
  accent: 'cyan' | 'blue' | 'green' | 'violet' | 'pink'
  minorUnits: Map<string, number>
  title: string
  values: CurrencyAmount[]
}) {
  return (
    <KpiCard
      accent={accent}
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
  const { t } = useLocalization()
  return (
    <ChartContainer
      {...(className === undefined ? {} : { className })}
      summary={t('Chart summary for {title}', { title })}
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
  const { t } = useLocalization()
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
        <summary>{t('View chart values')}</summary>
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
  const { t } = useLocalization()
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
                title={[
                  t('Income'),
                  formatCurrencyAmount(
                    total.incomeAmountMinor,
                    total.currencyCode,
                    minorUnits.get(total.currencyCode) ?? 2,
                  ),
                ].join(': ')}
              />
              <span
                className="expense-bar"
                style={{
                  width: `${(total.expenseAmountMinor / maximum) * 100}%`,
                }}
                title={[
                  t('Expenses'),
                  formatCurrencyAmount(
                    total.expenseAmountMinor,
                    total.currencyCode,
                    minorUnits.get(total.currencyCode) ?? 2,
                  ),
                ].join(': ')}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BarChart({
  className,
  minorUnits,
  values,
}: {
  className?: string
  minorUnits: Map<string, number>
  values: Array<CurrencyAmount & { label: string }>
}) {
  if (values.length === 0) return <EmptyChart />
  const displayed = values
  const maximum = Math.max(...displayed.map((value) => value.amountMinor), 1)
  return (
    <ol className={['bar-chart', className].filter(Boolean).join(' ')}>
      {displayed.map((value) => (
        <li key={`${value.label}-${value.currencyCode}`}>
          <span>{value.label}</span>
          <div>
            <i
              className={`donut-segment-${chartAccentIndex(`${value.label}:${value.currencyCode}`)}`}
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
  const { t } = useLocalization()
  const [activeKey, setActiveKey] = useState<string | null>(null)
  if (values.length === 0) return <EmptyChart />
  const displayed = values
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
        aria-label={t('Expense distribution by category')}
        className="donut-chart"
        role="img"
        viewBox="0 0 42 42"
      >
        <title>{t('Expense distribution by category')}</title>
        {segments.map(({ offset, value }) => {
          const accentIndex = chartAccentIndex(
            `${value.categoryName}:${value.currencyCode}`,
          )
          const key = categoryKey(value)
          const isActive = activeKey === key
          return (
            <g
              aria-label={`${value.categoryName}: ${formatCurrencyAmount(value.amountMinor, value.currencyCode, minorUnits.get(value.currencyCode) ?? 2)}`}
              className={`donut-segment-group${isActive ? ' is-active' : ''}${activeKey !== null && !isActive ? ' is-muted' : ''}`}
              key={key}
              onBlur={() => setActiveKey(null)}
              onFocus={() => setActiveKey(key)}
              onPointerEnter={() => setActiveKey(key)}
              onPointerLeave={() => setActiveKey(null)}
              role="button"
              tabIndex={0}
            >
              <circle
                className={`donut-segment donut-segment-${accentIndex}`}
                cx="21"
                cy="21"
                fill="transparent"
                r="15.9155"
                strokeDasharray={`${(value.amountMinor / total) * 100} ${100 - (value.amountMinor / total) * 100}`}
                strokeDashoffset={-offset}
              />
            </g>
          )
        })}
      </svg>
      <ol className="donut-legend">
        {displayed.map((value) => (
          <li
            className={activeKey === categoryKey(value) ? 'is-active' : ''}
            key={categoryKey(value)}
            onPointerEnter={() => setActiveKey(categoryKey(value))}
            onPointerLeave={() => setActiveKey(null)}
          >
            <button
              onBlur={() => setActiveKey(null)}
              onFocus={() => setActiveKey(categoryKey(value))}
              type="button"
            >
              <i
                aria-hidden="true"
                className={`donut-legend-marker donut-segment-${chartAccentIndex(`${value.categoryName}:${value.currencyCode}`)}`}
              />
              <span>{value.categoryName}</span>
            </button>
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

function categoryKey(value: {
  categoryId?: string | null
  categoryName: string
  currencyCode: string
}): string {
  return `${value.categoryId ?? value.categoryName}:${value.currencyCode}`
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
  const { t } = useLocalization()
  return (
    <Card className="evidence-card" title={title}>
      {values.length === 0 ? (
        <p className="metric-empty">{t('No data in this period.')}</p>
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
  const { t } = useLocalization()
  return (
    <Card className="evidence-card" title={title}>
      {loading ? (
        <p className="metric-empty">{t('Loading…')}</p>
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
  const { t } = useLocalization()
  return <p className="chart-empty">{t('No data in this period.')}</p>
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
