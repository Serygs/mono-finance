import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Controls'
import { Card, InfoTooltip } from '../../components/ui/Surfaces'
import { displayExpenseCategories } from '../categories/category-analytics-data'
import type { CustomCategory } from '../categories/categories-api'
import { type TranslationKey } from '../localization/localization'
import type { DashboardAnalytics } from './dashboard-data'
import { formatPeriod } from './dashboard-data'
import type { DashboardWidgetId } from './dashboard-preferences'
import { LIST_WIDGET_IDS, WIDGET_HELP } from './dashboard-widget-config'
import {
  CategoryRankingChart,
  IncomeExpenseChart,
  SpendingTrendChart,
  WeekdaySpendingChart,
} from './widgets/DashboardCharts'
import {
  AmountEvidenceList,
  FixedVariableExpensesWidget,
  RecurringExpensesWidget,
  TransactionEvidenceWidget,
  type TransactionEvidenceState,
} from './widgets/DashboardEvidenceWidgets'

export interface DashboardEvidenceData {
  corrections: TransactionEvidenceState
  compensations: TransactionEvidenceState
}

export function buildDashboardWidgets(
  t: (
    key: TranslationKey,
    variables?: Record<string, string | number>,
  ) => string,
  chart: DashboardAnalytics,
  units: Map<string, number>,
  currency: string | null,
  categories: ReturnType<typeof displayExpenseCategories>,
  expanded: boolean,
  setExpanded: (value: boolean | ((value: boolean) => boolean)) => void,
  evidence: DashboardEvidenceData,
  locale: string,
  customCategories: CustomCategory[],
) {
  return [
    createDashboardWidget(
      t,
      'income-expenses',
      'Income vs expenses',
      <IncomeExpenseChart
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
    createDashboardWidget(
      t,
      'spending-by-category',
      'Spending by category',
      <>
        <CategoryRankingChart
          units={units}
          customCategories={customCategories}
          totals={categories.all}
          other={
            expanded || categories.initial.length <= 5
              ? undefined
              : { ...categories.initial[5]!, label: t('Other categories') }
          }
          values={(expanded
            ? categories.all
            : categories.initial.slice(0, 5)
          ).map((item) => ({ ...item, label: item.categoryName }))}
        />
        {categories.all.length > 5 ? (
          <Button
            onClick={() => setExpanded((value) => !value)}
            size="small"
            type="button"
            variant="quiet"
          >
            {t(expanded ? 'Show less' : 'View all categories')}
          </Button>
        ) : null}
      </>,
      6,
      Math.max(
        7,
        categories.initial.length + 4 + (categories.all.length > 5 ? 2 : 0),
      ),
    ),
    createDashboardWidget(
      t,
      'spending-by-weekday',
      'Spending by weekday',
      <WeekdaySpendingChart
        units={units}
        values={chart.breakdowns.spendingByWeekday}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'spending-trend',
      'Spending trend',
      <SpendingTrendChart
        currency={currency}
        points={chart.trends.spendingTrend}
        units={units}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'monthly-trend',
      'Monthly trend',
      <SpendingTrendChart
        currency={currency}
        points={chart.trends.monthly}
        units={units}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'top-merchants',
      'Top merchants',
      <AmountEvidenceList
        units={units}
        values={chart.breakdowns.topMerchants.map((item) => ({
          ...item,
          detail: t('{count} transactions', { count: item.transactionCount }),
          direction: 'expense' as const,
          label: item.description,
        }))}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'recurring-expenses',
      'Repeated purchases',
      <RecurringExpensesWidget
        units={units}
        values={chart.breakdowns.recurringExpenses}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'fixed-variable-expenses',
      'Repeated vs other expenses',
      <FixedVariableExpensesWidget
        units={units}
        values={chart.breakdowns.fixedVariableExpenses}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'largest-transactions',
      'Largest transactions',
      <AmountEvidenceList
        units={units}
        values={chart.breakdowns.largestTransactions.map((item) => ({
          ...item,
          detail: formatPeriod(item.timestamp, 'day', locale),
          label: item.description,
        }))}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'recent-corrections',
      'Recent corrections',
      <TransactionEvidenceWidget
        empty="No corrected transactions in this period."
        {...evidence.corrections}
        units={units}
        locale={locale}
      />,
      6,
      7,
    ),
    createDashboardWidget(
      t,
      'recent-compensations',
      'Recent compensations',
      <TransactionEvidenceWidget
        empty="No compensation links in this period."
        {...evidence.compensations}
        units={units}
        locale={locale}
      />,
      6,
      7,
    ),
  ]
}

function createDashboardWidget(
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
        className={`dashboard-widget-card dashboard-widget-card--${id}${LIST_WIDGET_IDS.has(id) ? ' dashboard-widget-card--list' : ''}`}
        actions={
          <span
            aria-label={t('Drag widget')}
            className="dashboard-widget__handle"
          >
            <Icon name="grip" />
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
