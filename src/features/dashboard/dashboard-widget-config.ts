import type { TranslationKey } from '../localization/localization'
import {
  DASHBOARD_WIDGET_IDS,
  DEFAULT_DASHBOARD_PREFERENCES,
  type DashboardPreferences,
  type DashboardWidgetId,
} from './dashboard-preferences'

export const WIDGET_HELP: Record<DashboardWidgetId, TranslationKey> = {
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
export const WIDGET_TITLES: Record<DashboardWidgetId, TranslationKey> = {
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
export const LIST_WIDGET_IDS = new Set<DashboardWidgetId>([
  'fixed-variable-expenses',
  'largest-transactions',
  'recent-compensations',
  'recent-corrections',
  'recurring-expenses',
  'spending-by-category',
  'top-merchants',
])
export function defaultWidgetLayout(
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

export function compareWidgetOrder(
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
