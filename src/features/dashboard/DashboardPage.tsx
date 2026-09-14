import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { Link } from 'react-router'

import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import {
  FormField,
  MultiSelect,
  Select,
} from '../../components/ui/FormControls'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { Card, InfoTooltip, KpiCard } from '../../components/ui/Surfaces'
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
  formatPeriodRange,
  groupTimeSeriesIntoBuckets,
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
const WIDGET_HELP: Record<DashboardWidgetId, TranslationKey> = {
  'expense-distribution': 'Expense distribution help',
  'fixed-variable-expenses': 'Fixed vs variable expenses help',
  'income-expenses': 'Income vs expenses help',
  'largest-transactions': 'Largest transactions help',
  'monthly-trend': 'Monthly trend help',
  'recent-compensations': 'Recent compensations help',
  'recent-corrections': 'Recent corrections help',
  'recent-transactions': 'Recent transactions help',
  'recurring-expenses': 'Recurring expenses help',
  'spending-by-category': 'Spending by category help',
  'spending-by-weekday': 'Spending by weekday help',
  'spending-trend': 'Spending trend help',
  'top-merchants': 'Top merchants help',
}
const WIDGET_TITLES: Record<DashboardWidgetId, TranslationKey> = {
  'expense-distribution': 'Expense distribution',
  'fixed-variable-expenses': 'Fixed vs variable expenses',
  'income-expenses': 'Income vs expenses',
  'largest-transactions': 'Largest transactions',
  'monthly-trend': 'Monthly trend',
  'recent-compensations': 'Recent compensations',
  'recent-corrections': 'Recent corrections',
  'recent-transactions': 'Recent transactions',
  'recurring-expenses': 'Recurring expenses',
  'spending-by-category': 'Spending by category',
  'spending-by-weekday': 'Spending by weekday',
  'spending-trend': 'Spending trend',
  'top-merchants': 'Top merchants',
}
const DEFAULT_WIDGET_ORDER = [
  ...DEFAULT_DASHBOARD_PREFERENCES.enabledWidgetIds,
  ...DASHBOARD_WIDGET_IDS.filter(
    (id) => !DEFAULT_DASHBOARD_PREFERENCES.enabledWidgetIds.includes(id),
  ),
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
  const [filtersOpen, setFiltersOpen] = useState(false)
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
        description={<p>{t('Your money, in clear focus.')}</p>}
        id="dashboard-title"
        title={t('Finance overview')}
      />
      <section className="dashboard-command-bar">
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
          onFiltersOpen={setFiltersOpen}
          onFrom={setFrom}
          onMode={setMode}
          onPreset={setPreset}
          onTo={setTo}
          preset={preset}
          filtersOpen={filtersOpen}
          to={to}
        />
        <div className="dashboard-toolbar-actions">
          <div className="dashboard-sync-popover">
            <Button
              aria-expanded={syncOpen}
              onClick={() => setSyncOpen(!syncOpen)}
              size="small"
              type="button"
              variant="secondary"
            >
              <span aria-hidden="true">↻</span>
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
            <span aria-hidden="true">⚙</span>
            {t('Customize dashboard')}
          </Button>
        </div>
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
  onFiltersOpen,
  onFrom,
  onMode,
  onPreset,
  onTo,
  preset,
  filtersOpen,
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
  onFiltersOpen(value: boolean): void
  onFrom(value: string): void
  onMode(value: 'base' | 'original'): void
  onPreset(value: DashboardDatePreset): void
  onTo(value: string): void
  preset: DashboardDatePreset
  filtersOpen: boolean
  to: string
}) {
  const { t } = useLocalization()
  const ids =
    filter.mode === 'all'
      ? accounts.map((account) => account.id)
      : filter.accountIds
  const chartCurrencies =
    analytics === undefined ? [] : availableCurrencies(analytics)
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
        <MultiSelect
          ariaLabel={t('Accounts')}
          menuLabel={t('Accounts')}
          onChange={(selected) => {
            onFilter(
              selected.length === 0 || selected.length === accounts.length
                ? { mode: 'all' }
                : { accountIds: selected, mode: 'selected' },
            )
          }}
          options={accounts.map((account) => ({
            label: `${account.type} · ${account.currency.code}`,
            value: account.id,
          }))}
          selectAllLabel={t('Select all')}
          triggerLabel={
            ids.length === accounts.length
              ? t('All accounts ({count})', { count: accounts.length })
              : t('{count} accounts selected', { count: ids.length })
          }
          value={ids}
        />
      </FormField>
      <FormField label={t('Currency')}>
        <Select
          onChange={(event) => {
            const value = event.target.value
            if (value === 'base') {
              onMode('base')
              onCurrency(null)
              return
            }
            onMode('original')
            onCurrency(value === 'original-all' ? null : value)
          }}
          value={mode === 'base' ? 'base' : (currency ?? 'original-all')}
        >
          <option value="original-all">{t('All original currencies')}</option>
          {chartCurrencies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="base">
            {baseCurrency} · {t('Base currency')}
          </option>
        </Select>
      </FormField>
      <div className={`dashboard-toolbar-menu${filtersOpen ? ' is-open' : ''}`}>
        <button
          aria-label={t('Filters')}
          aria-expanded={filtersOpen}
          className="dashboard-toolbar-menu__trigger"
          onClick={() => onFiltersOpen(!filtersOpen)}
          type="button"
        >
          <span aria-hidden="true">☷</span>
          {t('Filters')}
        </button>
        <div className="dashboard-toolbar-menu__content">
          <FormField
            className="dashboard-mobile-currency"
            label={t('Currency')}
          >
            <Select
              onChange={(event) => {
                const value = event.target.value
                if (value === 'base') {
                  onMode('base')
                  onCurrency(null)
                  return
                }
                onMode('original')
                onCurrency(value === 'original-all' ? null : value)
              }}
              value={mode === 'base' ? 'base' : (currency ?? 'original-all')}
            >
              <option value="original-all">
                {t('All original currencies')}
              </option>
              {chartCurrencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="base">
                {baseCurrency} · {t('Base currency')}
              </option>
            </Select>
          </FormField>
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
          ) : (
            <p className="dashboard-filter-hint">
              {t('Choose Custom range to set exact dates.')}
            </p>
          )}
        </div>
      </div>
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
    t,
    displayed,
    chart,
    units,
    chartCurrency,
    categories,
    expanded,
    setExpanded,
    recentLoading,
    transactions,
  )
  const visible = widgets.filter((item) =>
    preferences.enabledWidgetIds.includes(item.id),
  )
  const gridWidgets = visible.filter(
    (item) => item.id !== 'recent-transactions',
  )
  const layout = gridWidgets.map(
    (item, index) =>
      preferences.layout.find((saved) => saved.i === item.id) ??
      defaultWidgetLayout(item, index),
  )
  return (
    <>
      <section className="dashboard-kpis" aria-label={t('Period summary')}>
        <Metric
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
        <Metric
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
        <Metric
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
        <Metric
          accent="pink"
          description={t('Average spend / day help')}
          title={t('Average spend / day')}
          units={units}
          values={displayed.overview.averageExpensePerDay}
          icon="÷"
        />
      </section>
      {preferences.enabledWidgetIds.includes('recent-transactions') ? (
        <Card
          actions={
            <div className="recent-transactions-actions">
              <label>
                <span className="sr-only">{t('Show')}</span>
                <Select
                  aria-label={t('Show')}
                  onChange={(event) =>
                    onPreferences({
                      ...preferences,
                      recentTransactionsLimit: Number(event.target.value) as
                        5 | 10 | 20,
                    })
                  }
                  value={preferences.recentTransactionsLimit}
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                </Select>
              </label>
              <Link to="/transactions">
                {t('View all transactions')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          }
          className="dashboard-recent-card"
          title={
            <>
              {t('Recent transactions')}
              <InfoTooltip
                description={t('Recent transactions help')}
                label={t('Recent transactions')}
              />
            </>
          }
        >
          <Recent
            limit={preferences.recentTransactionsLimit}
            loading={recentLoading}
            transactions={transactions}
            units={units}
          />
        </Card>
      ) : null}
      <div className="dashboard-grid-shell" ref={containerRef}>
        {!mounted ? null : width < 768 ? (
          <div className="dashboard-mobile-widgets">
            {[...gridWidgets]
              .sort((left, right) =>
                compareWidgetOrder(left.id, right.id, preferences),
              )
              .map((item) => (
                <div key={item.id}>{item.content}</div>
              ))}
          </div>
        ) : (
          <GridLayout
            className="dashboard-grid"
            dragConfig={{ enabled: true, handle: '.dashboard-widget__handle' }}
            gridConfig={{ cols: 12, margin: [16, 16], rowHeight: 30 }}
            layout={layout}
            onLayoutChange={(next) =>
              onPreferences({ ...preferences, layout: next })
            }
            resizeConfig={{ enabled: true }}
            width={width}
          >
            {gridWidgets.map((item) => (
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

function defaultWidgetLayout(
  item: { h: number; id: DashboardWidgetId; w: number },
  index: number,
) {
  const priority: Partial<Record<DashboardWidgetId, { x: number; y: number }>> =
    {
      'recent-transactions': { x: 0, y: 0 },
      'income-expenses': { x: 0, y: 7 },
      'spending-by-weekday': { x: 6, y: 7 },
      'spending-by-category': { x: 0, y: 15 },
      'spending-trend': { x: 6, y: 15 },
    }
  const position = priority[item.id] ?? {
    x: (index % 2) * 6,
    y: 23 + Math.floor(index / 2) * 7,
  }
  return {
    h: item.id === 'recent-transactions' ? 6 : item.h,
    i: item.id,
    minH: 4,
    minW: 3,
    w: item.id === 'recent-transactions' ? 12 : item.w,
    ...position,
  }
}

function buildWidgets(
  t: (
    key: TranslationKey,
    variables?: Record<string, string | number>,
  ) => string,
  _all: DashboardAnalytics,
  chart: DashboardAnalytics,
  units: Map<string, number>,
  currency: string | null,
  categories: ReturnType<typeof displayExpenseCategories>,
  expanded: boolean,
  setExpanded: (value: boolean | ((value: boolean) => boolean)) => void,
  loading: boolean,
  transactions: TransactionListItem[],
) {
  const corrections = transactions
    .filter((item) => item.hasAdjustment)
    .slice(0, 5)
  const compensations = transactions
    .filter((item) => item.hasCompensation)
    .slice(0, 5)
  return [
    box(
      t,
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
      6,
      7,
    ),
    box(
      t,
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
            {t(expanded ? 'Show less' : 'Show all')}
          </Button>
        ) : null}
      </>,
      6,
      7,
    ),
    box(
      t,
      'spending-by-weekday',
      'Spending by weekday',
      <WeekdayBars units={units} values={chart.breakdowns.spendingByWeekday} />,
      6,
      7,
    ),
    box(
      t,
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
      t,
      'monthly-trend',
      'Monthly trend',
      <Trend currency={currency} points={chart.trends.monthly} units={units} />,
      6,
      7,
    ),
    box(
      t,
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
      t,
      'top-merchants',
      'Top merchants',
      <Evidence
        units={units}
        values={chart.breakdowns.topMerchants.map((item) => ({
          ...item,
          detail: t('{count} transactions', { count: item.transactionCount }),
          label: item.description,
        }))}
      />,
      6,
      6,
    ),
    box(
      t,
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
      t,
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
      t,
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
      t,
      'recent-corrections',
      'Recent corrections',
      <TransactionEvidence
        empty={t('No corrected transactions in this period.')}
        loading={loading}
        transactions={corrections}
        units={units}
      />,
      6,
      6,
    ),
    box(
      t,
      'recent-compensations',
      'Recent compensations',
      <TransactionEvidence
        empty={t('No compensation links in this period.')}
        loading={loading}
        transactions={compensations}
        units={units}
      />,
      6,
      6,
    ),
  ]
}

function compareWidgetOrder(
  left: DashboardWidgetId,
  right: DashboardWidgetId,
  preferences: DashboardPreferences,
) {
  const leftLayout = preferences.layout.find((item) => item.i === left)
  const rightLayout = preferences.layout.find((item) => item.i === right)
  if (leftLayout !== undefined && rightLayout !== undefined) {
    const layoutDifference =
      leftLayout.y * 12 + leftLayout.x - (rightLayout.y * 12 + rightLayout.x)
    if (layoutDifference !== 0) return layoutDifference
  }
  return (
    DEFAULT_WIDGET_ORDER.indexOf(left) - DEFAULT_WIDGET_ORDER.indexOf(right)
  )
}

function box(
  t: (key: TranslationKey) => string,
  id: DashboardWidgetId,
  title: TranslationKey,
  children: React.ReactNode,
  w: number,
  h: number,
) {
  return {
    content: (
      <Card
        actions={
          <span
            aria-label={t('Drag widget')}
            className="dashboard-widget__handle"
          >
            ⋯
          </span>
        }
        title={
          <>
            {t(title)}
            <InfoTooltip description={t(WIDGET_HELP[id])} label={t(title)} />
          </>
        }
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
  transactions,
  units,
}: {
  limit: 5 | 10 | 20
  loading: boolean
  transactions: TransactionListItem[]
  units: Map<string, number>
}) {
  const { t } = useLocalization()
  return (
    <>
      {loading ? (
        <Skeleton label={t('Loading transactions…')} lines={3} />
      ) : transactions.length === 0 ? (
        <Empty message="No transactions in this view" />
      ) : (
        <ol className="recent-transactions-list">
          {transactions.slice(0, limit).map((item) => (
            <li key={item.id}>
              <time>{formatTransactionDate(item.originalTimestamp)}</time>
              <span className="recent-transaction-merchant">
                <strong>{item.originalDescription}</strong>
                <small>{item.account.type}</small>
              </span>
              <span className="recent-transaction-category">
                {item.category.name ?? t('Uncategorized')}
              </span>
              <b
                className={
                  item.effectiveAmountMinor >= 0 ? 'is-income' : undefined
                }
              >
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
  const { locale, t } = useLocalization()
  if (currency === null || points.length === 0) return <Empty />
  const buckets = groupTimeSeriesIntoBuckets(points)
  const max = Math.max(
    ...buckets.flatMap((item) => [
      item.incomeAmountMinor,
      Math.abs(item.expenseAmountMinor),
    ]),
    1,
  )
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
        {buckets.map((item) => {
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
            Math.abs(item.expenseAmountMinor),
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
                  style={{ height: `${(item.incomeAmountMinor / max) * 100}%` }}
                />
                <span
                  className="expense-bar"
                  style={{
                    height: `${(Math.abs(item.expenseAmountMinor) / max) * 100}%`,
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
function Trend({
  currency,
  points,
  units,
}: {
  currency: string | null
  points: TimeSeriesPoint[]
  units: Map<string, number>
}) {
  const { locale, t } = useLocalization()
  if (currency === null || points.length === 0) return <Empty />
  if (points.length < 2)
    return <Empty message="Not enough data in this period." />
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
          <stop offset="0" stopColor="var(--color-action)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--color-action)" stopOpacity="0" />
        </linearGradient>
      </defs>
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
  const { t } = useLocalization()
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
  const { t } = useLocalization()
  return values.length === 0 ? (
    <Empty />
  ) : (
    <ol className="evidence-list recurring-expenses-list">
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
            )}
            <small>
              {t('Last')}{' '}
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
  const { t } = useLocalization()
  if (values.length === 0) return <Empty />
  return (
    <Bars
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
  const { t } = useLocalization()
  return loading ? (
    <Skeleton label={t('Loading…')} lines={3} />
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
function Empty({
  message = 'No data in this period.',
}: {
  message?: TranslationKey
}) {
  const { t } = useLocalization()
  return <p className="chart-empty">{t(message)}</p>
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
              {t(WIDGET_TITLES[id])}
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

function formatTransactionDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(timestamp * 1_000)
}
