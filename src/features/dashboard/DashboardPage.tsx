import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { Link } from 'react-router'

import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { Card, KpiCard } from '../../components/ui/Surfaces'
import { getAccounts, synchronizeAccounts } from '../accounts/accounts-api'
import {
  loadAccountFilter,
  saveAccountFilter,
  type AccountFilter,
} from '../accounts/account-filter-storage'
import type { AccountSummary } from '../accounts/account-types'
import {
  type TranslationKey,
  useLocalization,
} from '../localization/localization'
import { getCurrencyPreferences } from '../settings/currency-preferences-api'
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
  type TimeSeriesPoint,
} from './analytics-api'
import {
  availableCurrencies,
  chartAccentIndex,
  displayExpenseCategories,
  filterDashboardAnalytics,
  formatCurrencyAmount,
  formatPeriod,
  resolveDashboardRange,
  DEFAULT_DASHBOARD_DATE_PRESET,
  type DashboardDatePreset,
} from './dashboard-data'
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_PREFERENCES,
  loadDashboardPreferences,
  resetDashboardLayout,
  resetDashboardWidgetSizes,
  saveDashboardPreferences,
  type DashboardPreferences,
  type DashboardWidgetId,
} from './dashboard-preferences'

const DATE_PRESETS: Array<{
  label: TranslationKey
  value: DashboardDatePreset
}> = [
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
  const client = useQueryClient()
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null)
  const [filter, setFilter] = useState<AccountFilter>(loadAccount)
  const [preset, setPreset] = useState<DashboardDatePreset>(
    DEFAULT_DASHBOARD_DATE_PRESET,
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState<'base' | 'original'>('original')
  const [currency, setCurrency] = useState<string | null>(null)
  const [preferences, setPreferences] =
    useState<DashboardPreferences>(loadPreferences)
  const [customizing, setCustomizing] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  const [syncingAccounts, setSyncingAccounts] = useState(false)
  const [syncingTransactions, setSyncingTransactions] = useState(false)
  const [syncStates, setSyncStates] = useState<TransactionSyncState[] | null>(
    null,
  )
  const [error, setError] = useState<TranslationKey | null>(null)
  const range = useMemo(
    () => resolveDashboardRange(preset, from, to),
    [from, preset, to],
  )
  const accountIds = useMemo(
    () => (filter.mode === 'selected' ? filter.accountIds : []),
    [filter],
  )
  const currencies = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: ['currency-preferences'],
  })
  const analyticsFilters = useMemo(
    () =>
      range === null
        ? null
        : {
            accountIds,
            ...(mode === 'base'
              ? { baseCurrencyCode: currencies.data?.baseCurrencyCode ?? 'UAH' }
              : {}),
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
          },
    [accountIds, currencies.data?.baseCurrencyCode, mode, range],
  )
  const analytics = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () => getDashboardAnalytics(analyticsFilters!),
    queryKey: ['dashboard-analytics', analyticsFilters],
  })
  const transactionFilters = useMemo<TransactionListFilters>(
    () => ({
      accountIds,
      category: null,
      currency: mode === 'original' ? currency : null,
      dateFrom: range?.dateFrom ?? null,
      dateTo: range?.dateTo ?? null,
      direction: null,
      excluded: false,
      search: null,
    }),
    [accountIds, currency, mode, range],
  )
  const recent = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () => getTransactions(transactionFilters, undefined, 100),
    queryKey: ['dashboard-recent', transactionFilters],
  })
  useEffect(() => {
    void getAccounts()
      .then(setAccounts)
      .catch(() => setError('Accounts could not be loaded. Try again later.'))
    void getTransactionSyncStatus()
      .then(setSyncStates)
      .catch(() => setError('Transaction sync status could not be loaded.'))
  }, [])
  useEffect(() => {
    storeAccount(filter)
  }, [filter])
  useEffect(() => {
    storePreferences(preferences)
  }, [preferences])
  async function syncAccounts() {
    setSyncingAccounts(true)
    try {
      setAccounts(await synchronizeAccounts())
      await client.invalidateQueries({ queryKey: ['dashboard-analytics'] })
    } catch {
      setError('Accounts could not be synchronized. Try again later.')
    } finally {
      setSyncingAccounts(false)
    }
  }
  async function syncTransactions() {
    setSyncingTransactions(true)
    try {
      await synchronizeTransactions()
      setSyncStates(await getTransactionSyncStatus())
      await Promise.all([
        client.invalidateQueries({ queryKey: ['dashboard-analytics'] }),
        client.invalidateQueries({ queryKey: ['dashboard-recent'] }),
      ])
    } catch {
      setError('Transaction sync is unavailable. Try again later.')
    } finally {
      setSyncingTransactions(false)
    }
  }
  return (
    <PageSurface className="dashboard-page">
      <PageHeader
        description={
          <p>
            {t(
              DATE_PRESETS.find((item) => item.value === preset)?.label ??
                'Custom range',
            )}
          </p>
        }
        id="dashboard-title"
        title={t('Finance overview')}
      />
      <Toolbar
        accounts={accounts ?? []}
        analytics={analytics.data}
        baseCurrency={currencies.data?.baseCurrencyCode ?? 'UAH'}
        currency={currency}
        filter={filter}
        from={from}
        mode={mode}
        onCurrency={setCurrency}
        onFilter={setFilter}
        onFrom={setFrom}
        onMode={setMode}
        onPreset={setPreset}
        onTo={setTo}
        preset={preset}
        to={to}
      />
      <section className="dashboard-toolbar-actions">
        <div className="dashboard-sync-popover">
          <Button
            aria-expanded={syncOpen}
            onClick={() => setSyncOpen(!syncOpen)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Sync status')}
          </Button>
          {syncOpen ? (
            <div className="dashboard-popover" role="dialog">
              <div className="dashboard-sync-actions">
                <Button
                  disabled={syncingAccounts}
                  loading={syncingAccounts}
                  onClick={() => void syncAccounts()}
                  size="small"
                  type="button"
                  variant="secondary"
                >
                  {t('Sync accounts')}
                </Button>
                <Button
                  disabled={syncingTransactions}
                  loading={syncingTransactions}
                  onClick={() => void syncTransactions()}
                  size="small"
                  type="button"
                >
                  {t('Refresh transactions')}
                </Button>
              </div>
              <SyncSummary states={syncStates} />
            </div>
          ) : null}
        </div>
        <Button
          onClick={() => setCustomizing(true)}
          size="small"
          type="button"
          variant="secondary"
        >
          {t('Customize dashboard')}
        </Button>
      </section>
      {error === null ? null : (
        <Alert tone="danger" title={t('Dashboard update failed')}>
          {error}
        </Alert>
      )}
      {range === null ? (
        <Alert tone="danger" title={t('Date range is incomplete')}>
          {t('Enter a valid start and end date to view analytics.')}
        </Alert>
      ) : null}
      {analytics.isPending ? (
        <Skeleton label={t('Loading dashboard…')} lines={6} />
      ) : null}
      {analytics.isError ? (
        <Alert tone="danger" title={t('Analytics could not be loaded')}>
          <Button
            onClick={() => void analytics.refetch()}
            size="small"
            type="button"
          >
            {t('Retry analytics')}
          </Button>
        </Alert>
      ) : null}
      {analytics.data === undefined || range === null ? null : (
        <Dashboard
          accounts={accounts ?? []}
          analytics={analytics.data}
          currency={mode === 'original' ? currency : null}
          onPreferences={setPreferences}
          preferences={preferences}
          recentLoading={recent.isPending}
          transactions={recent.data?.transactions ?? []}
        />
      )}
      {customizing ? (
        <Customize
          onChange={setPreferences}
          onClose={() => setCustomizing(false)}
          preferences={preferences}
        />
      ) : null}
    </PageSurface>
  )
}

function Toolbar({
  accounts,
  analytics,
  baseCurrency,
  currency,
  filter,
  from,
  mode,
  onCurrency,
  onFilter,
  onFrom,
  onMode,
  onPreset,
  onTo,
  preset,
  to,
}: {
  accounts: AccountSummary[]
  analytics: DashboardAnalytics | undefined
  baseCurrency: string
  currency: string | null
  filter: AccountFilter
  from: string
  mode: 'base' | 'original'
  onCurrency(value: string | null): void
  onFilter(value: AccountFilter): void
  onFrom(value: string): void
  onMode(value: 'base' | 'original'): void
  onPreset(value: DashboardDatePreset): void
  onTo(value: string): void
  preset: DashboardDatePreset
  to: string
}) {
  const { t } = useLocalization()
  const ids =
    filter.mode === 'all'
      ? accounts.map((account) => account.id)
      : filter.accountIds
  return (
    <section className="dashboard-toolbar" aria-label={t('Dashboard filters')}>
      <FormField label={t('Period')}>
        <Select
          onChange={(event) =>
            onPreset(event.target.value as DashboardDatePreset)
          }
          value={preset}
        >
          {DATE_PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.label)}
            </option>
          ))}
        </Select>
      </FormField>
      <FormField label={t('Accounts')}>
        <select
          className="ui-select"
          multiple
          onChange={(event) => {
            const selected = Array.from(
              event.currentTarget.selectedOptions,
            ).map((option) => option.value)
            onFilter(
              selected.length === 0 || selected.length === accounts.length
                ? { mode: 'all' }
                : { accountIds: selected, mode: 'selected' },
            )
          }}
          value={ids}
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.type} · {account.currency.code}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t('Currency')}>
        <Select
          onChange={(event) =>
            onMode(event.target.value as 'base' | 'original')
          }
          value={mode}
        >
          <option value="original">{t('Original currencies')}</option>
          <option value="base">
            {t('Base currency')} · {baseCurrency}
          </option>
        </Select>
      </FormField>
      <details className="dashboard-toolbar-menu">
        <summary>{t('Filters')}</summary>
        {preset === 'custom' ? (
          <div>
            <FormField label={t('From')}>
              <input
                onChange={(event) => onFrom(event.target.value)}
                type="date"
                value={from}
              />
            </FormField>
            <FormField label={t('To')}>
              <input
                onChange={(event) => onTo(event.target.value)}
                type="date"
                value={to}
              />
            </FormField>
          </div>
        ) : null}
        {mode === 'original' ? (
          <FormField label={t('Original currency')}>
            <Select
              onChange={(event) => onCurrency(event.target.value || null)}
              value={currency ?? ''}
            >
              <option value="">{t('All original currencies')}</option>
              {analytics === undefined
                ? null
                : availableCurrencies(analytics).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
            </Select>
          </FormField>
        ) : null}
      </details>
    </section>
  )
}

function Dashboard({
  accounts,
  analytics,
  currency,
  onPreferences,
  preferences,
  recentLoading,
  transactions,
}: {
  accounts: AccountSummary[]
  analytics: DashboardAnalytics
  currency: string | null
  onPreferences(value: DashboardPreferences): void
  preferences: DashboardPreferences
  recentLoading: boolean
  transactions: TransactionListItem[]
}) {
  const { t } = useLocalization()
  const { containerRef, mounted, width } = useContainerWidth()
  const [expanded, setExpanded] = useState(false)
  const displayed = filterDashboardAnalytics(analytics, currency)
  const chartCurrency = currency ?? availableCurrencies(analytics)[0] ?? null
  const chart = filterDashboardAnalytics(analytics, chartCurrency)
  const units = new Map(
    accounts.map((account) => [
      account.currency.code,
      account.currency.minorUnit,
    ]),
  )
  const categories = displayExpenseCategories(
    chart.breakdowns.expensesByCategory,
    t('Other'),
  )
  const widgets = buildWidgets(
    displayed,
    chart,
    units,
    chartCurrency,
    categories,
    expanded,
    setExpanded,
    recentLoading,
    transactions,
    preferences.recentTransactionsLimit,
    (recentTransactionsLimit) =>
      onPreferences({ ...preferences, recentTransactionsLimit }),
  )
  const visible = widgets.filter((item) =>
    preferences.enabledWidgetIds.includes(item.id),
  )
  const layout = visible.map(
    (item, index) =>
      preferences.layout.find((saved) => saved.i === item.id) ?? {
        h: item.h,
        i: item.id,
        minH: 4,
        minW: 3,
        w: item.w,
        x: (index % 2) * 6,
        y: Math.floor(index / 2) * 7,
      },
  )
  return (
    <>
      <section className="dashboard-kpis" aria-label={t('Period summary')}>
        <Metric
          accent="cyan"
          title={t('Total spent')}
          units={units}
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.expenseAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <Metric
          accent="blue"
          title={t('Total income')}
          units={units}
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.incomeAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <Metric
          accent="green"
          title={t('Net cash flow')}
          units={units}
          values={displayed.overview.totals.map((item) => ({
            amountMinor: item.netAmountMinor,
            currencyCode: item.currencyCode,
          }))}
        />
        <Metric
          accent="pink"
          title={t('Average spend / day')}
          units={units}
          values={displayed.overview.averageExpensePerDay}
        />
      </section>
      <div className="dashboard-grid-shell" ref={containerRef}>
        {!mounted ? null : width < 768 ? (
          <div className="dashboard-mobile-widgets">
            {visible.map((item) => (
              <div key={item.id}>{item.content}</div>
            ))}
          </div>
        ) : (
          <GridLayout
            className="dashboard-grid"
            dragConfig={{ enabled: true, handle: '.dashboard-widget__handle' }}
            gridConfig={{ cols: 12, margin: [16, 16], rowHeight: 42 }}
            layout={layout}
            onLayoutChange={(next) =>
              onPreferences({ ...preferences, layout: next })
            }
            resizeConfig={{ enabled: true }}
            width={width}
          >
            {visible.map((item) => (
              <div className="dashboard-widget" key={item.id}>
                {item.content}
              </div>
            ))}
          </GridLayout>
        )}
      </div>
    </>
  )
}

function buildWidgets(
  _all: DashboardAnalytics,
  chart: DashboardAnalytics,
  units: Map<string, number>,
  currency: string | null,
  categories: ReturnType<typeof displayExpenseCategories>,
  expanded: boolean,
  setExpanded: (value: boolean | ((value: boolean) => boolean)) => void,
  loading: boolean,
  transactions: TransactionListItem[],
  limit: 5 | 10 | 20,
  onRecentLimit: (value: 5 | 10 | 20) => void,
) {
  const corrections = transactions
    .filter((item) => item.hasAdjustment)
    .slice(0, 5)
  const compensations = transactions
    .filter((item) => item.hasCompensation)
    .slice(0, 5)
  return [
    box(
      'recent-transactions',
      'Recent transactions',
      <Recent
        limit={limit}
        loading={loading}
        onLimit={onRecentLimit}
        transactions={transactions}
        units={units}
      />,
      12,
      6,
    ),
    box(
      'income-expenses',
      'Income vs expenses',
      <GroupedBars
        currency={currency}
        points={
          chart.trends.daily.length > 90
            ? chart.trends.monthly
            : chart.trends.daily
        }
        units={units}
      />,
      12,
      7,
    ),
    box(
      'spending-by-category',
      'Spending by category',
      <>
        <Bars
          units={units}
          values={(expanded ? categories.all : categories.initial).map(
            (item) => ({ ...item, label: item.categoryName }),
          )}
        />
        {categories.all.length > 5 ? (
          <Button
            onClick={() => setExpanded((value) => !value)}
            size="small"
            type="button"
            variant="quiet"
          >
            {expanded ? 'Show less' : 'Show all'}
          </Button>
        ) : null}
      </>,
      6,
      7,
    ),
    box(
      'spending-trend',
      'Spending trend',
      <Trend
        currency={currency}
        points={chart.trends.spendingTrend}
        units={units}
      />,
      6,
      7,
    ),
    box(
      'monthly-trend',
      'Monthly trend',
      <Trend currency={currency} points={chart.trends.monthly} units={units} />,
      6,
      7,
    ),
    box(
      'expense-distribution',
      'Expense distribution',
      <Bars
        units={units}
        values={categories.initial.map((item) => ({
          ...item,
          label: item.categoryName,
        }))}
      />,
      6,
      7,
    ),
    box(
      'spending-by-weekday',
      'Spending by weekday',
      <WeekdayBars units={units} values={chart.breakdowns.spendingByWeekday} />,
      6,
      7,
    ),
    box(
      'top-merchants',
      'Top merchants',
      <Evidence
        units={units}
        values={chart.breakdowns.topMerchants.map((item) => ({
          ...item,
          detail: `${item.transactionCount} transactions`,
          label: item.description,
        }))}
      />,
      6,
      6,
    ),
    box(
      'recurring-expenses',
      'Recurring expenses',
      <RecurringExpenses
        units={units}
        values={chart.breakdowns.recurringExpenses}
      />,
      6,
      5,
    ),
    box(
      'fixed-variable-expenses',
      'Fixed vs variable expenses',
      <FixedVariableExpenses
        units={units}
        values={chart.breakdowns.fixedVariableExpenses}
      />,
      6,
      5,
    ),
    box(
      'largest-transactions',
      'Largest transactions',
      <Evidence
        units={units}
        values={chart.breakdowns.largestTransactions.map((item) => ({
          ...item,
          detail: formatPeriod(item.timestamp, 'day'),
          label: item.description,
        }))}
      />,
      6,
      6,
    ),
    box(
      'recent-corrections',
      'Recent corrections',
      <TransactionEvidence
        empty="No corrected transactions in this period."
        loading={loading}
        transactions={corrections}
        units={units}
      />,
      6,
      6,
    ),
    box(
      'recent-compensations',
      'Recent compensations',
      <TransactionEvidence
        empty="No compensation links in this period."
        loading={loading}
        transactions={compensations}
        units={units}
      />,
      6,
      6,
    ),
  ]
}
function box(
  id: DashboardWidgetId,
  title: string,
  children: React.ReactNode,
  w: number,
  h: number,
) {
  return {
    content: (
      <Card
        actions={
          <span aria-label="Drag widget" className="dashboard-widget__handle">
            ⋮⋮
          </span>
        }
        title={title}
      >
        {children}
      </Card>
    ),
    h,
    id,
    w,
  }
}
function Metric({
  accent,
  title,
  units,
  values,
}: {
  accent: 'cyan' | 'blue' | 'green' | 'violet' | 'pink'
  title: string
  units: Map<string, number>
  values: CurrencyAmount[]
}) {
  return (
    <KpiCard
      accent={accent}
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
                )}
              </strong>
            ))}
          </div>
        )
      }
    />
  )
}
function Recent({
  limit,
  loading,
  onLimit,
  transactions,
  units,
}: {
  limit: 5 | 10 | 20
  loading: boolean
  onLimit(value: 5 | 10 | 20): void
  transactions: TransactionListItem[]
  units: Map<string, number>
}) {
  const { t } = useLocalization()
  return (
    <>
      <label className="recent-transactions-limit">
        {t('Show')}{' '}
        <Select
          onChange={(event) =>
            onLimit(Number(event.target.value) as 5 | 10 | 20)
          }
          value={limit}
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </Select>
      </label>
      {loading ? (
        <Skeleton label={t('Loading transactions…')} lines={3} />
      ) : (
        <ol className="recent-transactions-list">
          {transactions.slice(0, limit).map((item) => (
            <li key={item.id}>
              <time>{formatPeriod(item.originalTimestamp, 'day')}</time>
              <span>
                <strong>{item.originalDescription}</strong>
                <small>{item.category.name ?? t('Uncategorized')}</small>
              </span>
              <b>
                {formatCurrencyAmount(
                  item.effectiveAmountMinor,
                  item.currencyCode,
                  units.get(item.currencyCode) ?? item.currencyMinorUnit,
                )}
              </b>
            </li>
          ))}
        </ol>
      )}
      <Link to="/transactions">{t('View all transactions')}</Link>
    </>
  )
}
function GroupedBars({
  currency,
  points,
  units,
}: {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}) {
  if (currency === null || points.length === 0) return <Empty />
  const buckets =
    points.length > 14 && points.length <= 90 ? weekly(points) : points
  const max = Math.max(
    ...buckets.flatMap((item) => [
      item.incomeAmountMinor,
      item.expenseAmountMinor,
    ]),
    1,
  )
  return (
    <div className="income-expense-vertical">
      {buckets.map((item) => (
        <div key={item.periodStart}>
          <div className="income-expense-bars">
            <span
              className="income-bar"
              style={{ height: `${(item.incomeAmountMinor / max) * 100}%` }}
              title={`Income: ${formatCurrencyAmount(item.incomeAmountMinor, currency, units.get(currency) ?? 2)}`}
            />
            <span
              className="expense-bar"
              style={{ height: `${(item.expenseAmountMinor / max) * 100}%` }}
              title={`Expenses: ${formatCurrencyAmount(item.expenseAmountMinor, currency, units.get(currency) ?? 2)}`}
            />
          </div>
          <small>
            {formatPeriod(
              item.periodStart,
              buckets.length > 12 ? 'month' : 'day',
            )}
          </small>
          <span className="sr-only">
            Net{' '}
            {formatCurrencyAmount(
              item.netAmountMinor,
              currency,
              units.get(currency) ?? 2,
            )}
          </span>
        </div>
      ))}
    </div>
  )
}
function weekly(points: TimeSeriesPoint[]) {
  const result = new Map<number, TimeSeriesPoint>()
  for (const item of points) {
    const date = new Date(item.periodStart * 1000)
    const start =
      new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate() - ((date.getDay() + 6) % 7),
      ).getTime() / 1000
    const current = result.get(start) ?? {
      currencyCode: item.currencyCode,
      expenseAmountMinor: 0,
      incomeAmountMinor: 0,
      netAmountMinor: 0,
      periodStart: start,
    }
    current.expenseAmountMinor += item.expenseAmountMinor
    current.incomeAmountMinor += item.incomeAmountMinor
    current.netAmountMinor += item.netAmountMinor
    result.set(start, current)
  }
  return [...result.values()]
}
function Trend({
  currency,
  points,
  units,
}: {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}) {
  if (currency === null || points.length === 0) return <Empty />
  const max = Math.max(...points.map((item) => item.expenseAmountMinor), 1)
  const path = points
    .map(
      (item, index) =>
        `${index === 0 ? 'M' : 'L'} ${20 + (index / Math.max(points.length - 1, 1)) * 680} ${260 - (item.expenseAmountMinor / max) * 220}`,
    )
    .join(' ')
  return (
    <svg
      aria-label="Spending trend"
      className="line-chart"
      role="img"
      viewBox="0 0 720 300"
    >
      <path className="line-chart-path" d={path} />
      {points.map((item, index) => (
        <circle
          cx={20 + (index / Math.max(points.length - 1, 1)) * 680}
          cy={260 - (item.expenseAmountMinor / max) * 220}
          key={item.periodStart}
          r="4"
        >
          <title>
            {formatCurrencyAmount(
              item.expenseAmountMinor,
              currency,
              units.get(currency) ?? 2,
            )}
          </title>
        </circle>
      ))}
    </svg>
  )
}
function Bars({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { label: string }>
}) {
  if (values.length === 0) return <Empty />
  const max = Math.max(...values.map((item) => item.amountMinor), 1)
  return (
    <ol className="bar-chart">
      {values.map((item) => (
        <li key={`${item.label}-${item.currencyCode}`}>
          <span>{item.label}</span>
          <div>
            <i
              className={`donut-segment-${chartAccentIndex(item.label)}`}
              style={{ width: `${(item.amountMinor / max) * 100}%` }}
            />
          </div>
          <strong>
            {formatCurrencyAmount(
              item.amountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
            )}
          </strong>
        </li>
      ))}
    </ol>
  )
}
function WeekdayBars({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { transactionCount: number; weekday: number }>
}) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  if (values.length === 0) return <Empty />
  const max = Math.max(...values.map((item) => item.amountMinor), 1)
  return (
    <div
      className="weekday-vertical-chart"
      role="img"
      aria-label="Spending by weekday"
    >
      {labels.map((label, index) => {
        const value = values.find((item) => item.weekday === index + 1)
        const amountMinor = value?.amountMinor ?? 0
        const currencyCode =
          value?.currencyCode ?? values[0]?.currencyCode ?? 'UAH'
        const transactionCount = value?.transactionCount ?? 0
        const amount = formatCurrencyAmount(
          amountMinor,
          currencyCode,
          units.get(currencyCode) ?? 2,
        )
        return (
          <div key={label}>
            <span
              style={{ height: `${(amountMinor / max) * 100}%` }}
              title={`${label}: ${amount} (${transactionCount} transactions)`}
            />
            <small>{label}</small>
            <span className="sr-only">
              {amount}, {transactionCount} transactions
            </span>
          </div>
        )
      })}
    </div>
  )
}
function RecurringExpenses({
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
  return values.length === 0 ? (
    <Empty />
  ) : (
    <ol className="evidence-list recurring-expenses-list">
      {values.slice(0, 5).map((item) => (
        <li key={`${item.description}-${item.currencyCode}`}>
          <span>
            <strong>{item.description}</strong>
            <small>
              About every {item.frequencyDays} days · {item.transactionCount}{' '}
              payments
            </small>
          </span>
          <b>
            Avg{' '}
            {formatCurrencyAmount(
              item.averageAmountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
            )}
            <small>
              Last{' '}
              {formatCurrencyAmount(
                item.lastAmountMinor,
                item.currencyCode,
                units.get(item.currencyCode) ?? 2,
              )}
            </small>
          </b>
        </li>
      ))}
    </ol>
  )
}
function FixedVariableExpenses({
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
  if (values.length === 0) return <Empty />
  return (
    <Bars
      units={units}
      values={values.flatMap((item) => [
        {
          amountMinor: item.fixedExpenseAmountMinor,
          currencyCode: item.currencyCode,
          label: 'Recurring / fixed',
        },
        {
          amountMinor: item.variableExpenseAmountMinor,
          currencyCode: item.currencyCode,
          label: 'Variable',
        },
      ])}
    />
  )
}
function Evidence({
  units,
  values,
}: {
  units: Map<string, number>
  values: Array<CurrencyAmount & { detail: string; label: string }>
}) {
  return values.length === 0 ? (
    <Empty />
  ) : (
    <ol className="evidence-list">
      {values.slice(0, 5).map((item) => (
        <li key={`${item.label}-${item.currencyCode}`}>
          <span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </span>
          <b>
            {formatCurrencyAmount(
              item.amountMinor,
              item.currencyCode,
              units.get(item.currencyCode) ?? 2,
            )}
          </b>
        </li>
      ))}
    </ol>
  )
}
function TransactionEvidence({
  empty,
  loading,
  transactions,
  units,
}: {
  empty: string
  loading: boolean
  transactions: TransactionListItem[]
  units: Map<string, number>
}) {
  return loading ? (
    <Skeleton label="Loading" lines={3} />
  ) : transactions.length === 0 ? (
    <p>{empty}</p>
  ) : (
    <Evidence
      units={units}
      values={transactions.map((item) => ({
        amountMinor: item.effectiveAmountMinor,
        currencyCode: item.currencyCode,
        detail: formatPeriod(item.originalTimestamp, 'day'),
        label: item.originalDescription,
      }))}
    />
  )
}
function Empty() {
  const { t } = useLocalization()
  return <p className="chart-empty">{t('No data in this period.')}</p>
}
function SyncSummary({ states }: { states: TransactionSyncState[] | null }) {
  const { t, locale } = useLocalization()
  return states === null ? (
    <Skeleton label={t('Loading transaction sync status…')} lines={2} />
  ) : (
    <ul className="sync-status-list">
      {states.map((item) => (
        <li key={item.accountId}>
          <span>
            {item.accountType} · {item.currencyCode}
          </span>
          <strong className={`sync-state sync-state-${item.status}`}>
            {item.status === 'failed'
              ? t('Sync needs retry')
              : item.lastSuccessfulSyncAt === null
                ? t('Not synced yet')
                : new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  }).format(item.lastSuccessfulSyncAt * 1000)}
          </strong>
        </li>
      ))}
    </ul>
  )
}
function Customize({
  onChange,
  onClose,
  preferences,
}: {
  onChange(value: DashboardPreferences): void
  onClose(): void
  preferences: DashboardPreferences
}) {
  const { t } = useLocalization()
  return (
    <div className="dashboard-dialog-backdrop">
      <section
        aria-label={t('Customize dashboard')}
        className="dashboard-dialog"
        role="dialog"
      >
        <header>
          <h2>{t('Customize dashboard')}</h2>
          <Button onClick={onClose} size="small" type="button" variant="quiet">
            {t('Close')}
          </Button>
        </header>
        <div className="dashboard-widget-toggles">
          {DASHBOARD_WIDGET_IDS.map((id) => (
            <label key={id}>
              <input
                checked={preferences.enabledWidgetIds.includes(id)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    enabledWidgetIds: preferences.enabledWidgetIds.includes(id)
                      ? preferences.enabledWidgetIds.filter(
                          (item) => item !== id,
                        )
                      : [...preferences.enabledWidgetIds, id],
                  })
                }
                type="checkbox"
              />
              {id.replaceAll('-', ' ')}
            </label>
          ))}
        </div>
        <div className="dashboard-dialog-actions">
          <Button
            onClick={() => onChange(resetDashboardLayout(preferences))}
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Reset layout')}
          </Button>
          <Button
            onClick={() => onChange(resetDashboardWidgetSizes(preferences))}
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Reset widget sizes')}
          </Button>
        </div>
      </section>
    </div>
  )
}
function loadAccount(): AccountFilter {
  try {
    return loadAccountFilter(window.localStorage)
  } catch {
    return { mode: 'all' }
  }
}
function storeAccount(filter: AccountFilter) {
  try {
    saveAccountFilter(window.localStorage, filter)
  } catch {
    /* Kept in memory. */
  }
}
function loadPreferences(): DashboardPreferences {
  try {
    return loadDashboardPreferences(window.localStorage)
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES
  }
}
function storePreferences(preferences: DashboardPreferences) {
  try {
    saveDashboardPreferences(window.localStorage, preferences)
  } catch {
    /* Kept in memory. */
  }
}
