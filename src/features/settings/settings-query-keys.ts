import type { QueryClient } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'

export const settingsQueryKeys = { currency: ['currency-preferences'] as const }

export function refreshCurrencyAnalytics(client: QueryClient) {
  return client.invalidateQueries({ queryKey: dashboardQueryKeys.analytics })
}
