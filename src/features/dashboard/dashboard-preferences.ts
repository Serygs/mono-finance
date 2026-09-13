import type { Layout } from 'react-grid-layout'

export const DASHBOARD_WIDGET_IDS = [
  'recent-transactions',
  'income-expenses',
  'spending-by-category',
  'spending-trend',
  'monthly-trend',
  'expense-distribution',
  'spending-by-weekday',
  'top-merchants',
  'recurring-expenses',
  'fixed-variable-expenses',
  'largest-transactions',
  'recent-corrections',
  'recent-compensations',
] as const

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number]

export interface DashboardPreferences {
  enabledWidgetIds: DashboardWidgetId[]
  layout: Layout
  recentTransactionsLimit: 5 | 10 | 20
}

export const DEFAULT_DASHBOARD_PREFERENCES: DashboardPreferences = {
  enabledWidgetIds: [
    'recent-transactions',
    'income-expenses',
    'spending-by-category',
    'spending-trend',
    'monthly-trend',
  ],
  layout: [],
  recentTransactionsLimit: 10,
}

const STORAGE_KEY = 'mono-finance.dashboard-preferences.v1'

export function loadDashboardPreferences(
  storage: Storage,
): DashboardPreferences {
  const rawValue = storage.getItem(STORAGE_KEY)
  if (rawValue === null) return DEFAULT_DASHBOARD_PREFERENCES
  try {
    const value = JSON.parse(rawValue) as Partial<DashboardPreferences>
    const enabledWidgetIds = DASHBOARD_WIDGET_IDS.filter((widgetId) =>
      value.enabledWidgetIds?.includes(widgetId),
    )
    return {
      enabledWidgetIds:
        enabledWidgetIds.length === 0
          ? DEFAULT_DASHBOARD_PREFERENCES.enabledWidgetIds
          : enabledWidgetIds,
      layout: Array.isArray(value.layout) ? value.layout : [],
      recentTransactionsLimit:
        value.recentTransactionsLimit === 5 ||
        value.recentTransactionsLimit === 20 ||
        value.recentTransactionsLimit === 10
          ? value.recentTransactionsLimit
          : DEFAULT_DASHBOARD_PREFERENCES.recentTransactionsLimit,
    }
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES
  }
}

export function saveDashboardPreferences(
  storage: Storage,
  preferences: DashboardPreferences,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(preferences))
}

export function resetDashboardLayout(
  preferences: DashboardPreferences,
): DashboardPreferences {
  return { ...preferences, layout: [] }
}

export function resetDashboardWidgetSizes(
  preferences: DashboardPreferences,
): DashboardPreferences {
  return {
    ...preferences,
    layout: preferences.layout.map(({ h, i, x, y }) => ({ h, i, w: 6, x, y })),
  }
}
