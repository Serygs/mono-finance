import { useState } from 'react'
import { Button } from '../../components/ui/Controls'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { useLocalization } from '../localization/localization'
import { DashboardCustomization } from './DashboardCustomization'
import { DashboardFilters } from './DashboardFilters'
import { DashboardLayout } from './DashboardLayout'
import { DashboardSyncSummary } from './DashboardSyncSummary'
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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [syncOpen, setSyncOpen] = useState(false)
  return (
    <PageSurface className="dashboard-page">
      <PageHeader
        description={<p>{t('Your money, in clear focus.')}</p>}
        id="dashboard-title"
        title={t('Finance overview')}
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
                <DashboardSyncSummary states={syncStates} />
              </div>
            ) : null}
          </div>
          <Button
            className="dashboard-customize-action"
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
        <DashboardLayout
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
        <DashboardCustomization
          onChange={setPreferences}
          onClose={() => setCustomizing(false)}
          preferences={preferences}
        />
      ) : null}
    </PageSurface>
  )
}
