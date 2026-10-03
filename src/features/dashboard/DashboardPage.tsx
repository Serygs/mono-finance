import { useRestoreFinanceScroll } from '../../lib/use-finance-view-history'
import { DataFreshness } from '../transactions/DataFreshness'
import { AnalyticsPeriod } from './AnalyticsPeriod'
import { useState } from 'react'
import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { useLocalization } from '../localization/localization'
import { DashboardCustomization } from './DashboardCustomization'
import { DashboardFilters } from './DashboardFilters'
import { DashboardLayout } from './DashboardLayout'
import { DashboardSyncSummary } from './DashboardSyncSummary'
import { Popover } from '../../components/ui/Popover'
import { BottomSheet } from '../../components/ui/Overlay'
import { Icon } from '../../components/ui/Icon'
import { useDashboardFilters } from './use-dashboard-filters'
import { useDashboardPreferences } from './use-dashboard-preferences'
import { useDashboardQueries } from './use-dashboard-queries'
import { useDashboardSync } from './use-dashboard-sync'

export function DashboardPage() {
  const { t } = useLocalization()
  const filters = useDashboardFilters()
  const {
    filter,
    setFilter,
    preset,
    setPreset,
    from,
    setFrom,
    to,
    setTo,
    mode,
    setMode,
    currency,
    setCurrency,
    range,
  } = filters
  const { currencies, analytics, recent } = useDashboardQueries(filters)
  const { preferences, setPreferences } = useDashboardPreferences()
  const {
    accounts,
    syncingAccounts,
    syncingTransactions,
    syncStates,
    syncAccounts,
    syncTransactions,
    error,
  } = useDashboardSync()
  const [customizing, setCustomizing] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  useRestoreFinanceScroll(!analytics.isPending)
  return (
    <PageSurface className="dashboard-page">
      <PageHeader
        id="dashboard-title"
        title={t('Finance overview')}
        actions={
          <Popover
            label={t('Overview actions')}
            className="dashboard-actions"
            content={
              <div className="dashboard-action-menu">
                <Button
                  data-popover-dismiss
                  variant="quiet"
                  onClick={() => {
                    setCustomizing(true)
                  }}
                >
                  {t('Customize dashboard')}
                </Button>
                <Button
                  data-popover-dismiss
                  variant="quiet"
                  onClick={() => {
                    setSyncOpen(true)
                  }}
                >
                  <Icon name="sync" />
                  {t('Sync status')}
                </Button>
              </div>
            }
          >
            <Icon name="more" />
            <span className="sr-only">{t('Overview actions')}</span>
          </Popover>
        }
      />
      <section className="dashboard-command-bar">
        <DashboardFilters
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
        <div className="analytics-meta">
          <AnalyticsPeriod range={range} />
          <DataFreshness accountIds={filters.accountIds} range={range} />
        </div>
      </section>
      {error === null ? null : (
        <Alert tone="danger" title={t('Dashboard update failed')}>
          {t(error)}
        </Alert>
      )}
      {range === null ? (
        <Alert tone="danger" title={t('Date range is incomplete')}>
          {t('Enter a valid start and end date to view analytics.')}
        </Alert>
      ) : null}
      {analytics.isPending && range !== null ? (
        <div className="dashboard-loading">
          <div className="dashboard-kpis">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} label={t('Loading dashboard…')} lines={2} />
            ))}
          </div>
          <Skeleton label={t('Loading transactions…')} lines={5} />
        </div>
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
        <DashboardLayout
          accounts={accounts ?? []}
          context={{
            accountIds: filters.accountIds,
            ...range,
            currencyMode: analytics.data.overview.currencyConversion.mode,
            amountMode: 'effective',
            excluded: false,
          }}
          analytics={analytics.data}
          currency={mode === 'original' ? currency : null}
          onPreferences={setPreferences}
          preferences={preferences}
          recentLoading={recent.isPending}
          recentError={recent.isError}
          onRetryRecent={() => void recent.refetch()}
          filtered={
            filter.mode === 'selected' ||
            preset === 'custom' ||
            currency !== null
          }
          transactions={recent.data?.transactions ?? []}
        />
      )}
      <BottomSheet
        open={syncOpen}
        onClose={() => setSyncOpen(false)}
        title={t('Sync status')}
      >
        {error === null ? null : (
          <Alert tone="danger" title={t('Dashboard update failed')}>
            {t(error)}
          </Alert>
        )}
        <div className="dashboard-sync-actions">
          <Button
            disabled={syncingAccounts}
            loading={syncingAccounts}
            onClick={() => void syncAccounts()}
            variant="secondary"
          >
            {t('Sync accounts')}
          </Button>
          <Button
            disabled={syncingTransactions}
            loading={syncingTransactions}
            onClick={() => void syncTransactions()}
          >
            {t('Refresh transactions')}
          </Button>
        </div>
        <DashboardSyncSummary states={syncStates} />
      </BottomSheet>
      {customizing ? (
        <DashboardCustomization
          onChange={setPreferences}
          onClose={() => setCustomizing(false)}
          preferences={preferences}
        />
      ) : null}
    </PageSurface>
  )
}
