import type { TransactionListFilters } from '../transactions/transaction-types'
import type { AnalyticsFilters } from './analytics-api'

export const dashboardQueryKeys = {
  analytics: ['dashboard-analytics'] as const,
  analyticsFor: (filters: AnalyticsFilters | null) =>
    ['dashboard-analytics', filters] as const,
  recent: ['dashboard-recent'] as const,
  recentFor: (filters: TransactionListFilters) =>
    ['dashboard-recent', filters] as const,
}
