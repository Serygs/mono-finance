import type { AnalyticsTransactionContext } from '../transactions/transaction-drill-down'
import { useState } from 'react'
import { GridLayout, useContainerWidth } from 'react-grid-layout'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { Card, InfoTooltip } from '../../components/ui/Surfaces'
import type { AccountSummary } from '../accounts/account-types'
import { displayExpenseCategories } from '../categories/category-analytics-data'
import { useCategoriesQuery } from '../categories/category-queries'
import { useLocalization } from '../localization/localization'
import type { TransactionListItem } from '../transactions/transaction-types'
import { TransactionDetailsSheet } from '../transactions/TransactionDetailsSheet'
import { useTransactionSelection } from '../transactions/use-transaction-selection'
import type { DashboardAnalytics } from './dashboard-data'
import { availableCurrencies, filterDashboardAnalytics } from './dashboard-data'
import type { DashboardPreferences } from './dashboard-preferences'
import {
  compareWidgetOrder,
  defaultWidgetLayout,
} from './dashboard-widget-config'
import { buildDashboardWidgets } from './dashboard-widget-registry'
import { DashboardKpis } from './widgets/DashboardKpis'
import { RecentTransactionsWidget } from './widgets/RecentTransactionsWidget'

export function DashboardLayout({
  accounts,
  context,
  analytics,
  currency,
  onPreferences,
  preferences,
  recentLoading,
  recentError,
  onRetryRecent,
  filtered,
  transactions,
}: {
  context: AnalyticsTransactionContext
  accounts: AccountSummary[]
  analytics: DashboardAnalytics
  currency: string | null
  onPreferences(value: DashboardPreferences): void
  preferences: DashboardPreferences
  recentError: boolean
  onRetryRecent(): void
  filtered: boolean
  recentLoading: boolean
  transactions: TransactionListItem[]
}) {
  const { locale, t } = useLocalization()
  const { data: customCategories = [] } = useCategoriesQuery()
  const { containerRef, mounted, width } = useContainerWidth()
  const [expanded, setExpanded] = useState(false)
  const selection = useTransactionSelection()
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
  const widgets = buildDashboardWidgets(
    t,
    chart,
    units,
    chartCurrency,
    categories,
    expanded,
    setExpanded,
    recentLoading,
    transactions,
    locale,
    customCategories,
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
      <DashboardKpis displayed={displayed} units={units} context={context} />
      {preferences.enabledWidgetIds.includes('recent-transactions') ? (
        <Card
          actions={
            <div className="recent-transactions-actions">
              <Link to="/transactions">
                <span>{t('All transactions')}</span>
                <Icon name="chevron" />
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
          {recentError ? (
            <Alert tone="danger" title={t('Transactions could not be loaded')}>
              <Button variant="secondary" onClick={onRetryRecent}>
                {t('Retry')}
              </Button>
            </Alert>
          ) : null}
          {recentError && transactions.length === 0 ? null : (
            <RecentTransactionsWidget
              onSelect={selection.setSelectedTransaction}
              limit={preferences.recentTransactionsLimit}
              loading={recentLoading}
              transactions={transactions}
              units={units}
              filtered={filtered}
              customCategories={customCategories}
            />
          )}
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
      <TransactionDetailsSheet selection={selection} />
    </>
  )
}
