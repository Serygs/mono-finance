import { useQuery, type QueryClient } from '@tanstack/react-query'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'
import { transactionQueryKeys } from '../transactions/transaction-queries'
import { getCategories } from './categories-api'
import type { MappingFilter } from './category-source-filtering'
import type { AnalyticsFilters } from '../dashboard/analytics-api'

export const categoryQueryKeys = {
  all: ['categories'] as const,
  sources: ['category-sources'] as const,
  analyticsFor: (filters: AnalyticsFilters | null) =>
    [...dashboardQueryKeys.analytics, 'category-breakdowns', filters] as const,
  sourcesFor: (filters: {
    mappingFilter: MappingFilter
    page: number
    query: string
  }) => ['category-sources', filters] as const,
}

export function useCategoriesQuery() {
  return useQuery({ queryFn: getCategories, queryKey: categoryQueryKeys.all })
}

export function refreshCategoryData(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: categoryQueryKeys.all }),
    client.invalidateQueries({ queryKey: categoryQueryKeys.sources }),
    client.invalidateQueries({ queryKey: transactionQueryKeys.all }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.analytics }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.recent }),
  ])
}

export function refreshCategorySourceMapping(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: categoryQueryKeys.sources }),
    client.invalidateQueries({ queryKey: transactionQueryKeys.all }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.analytics }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.recent }),
  ])
}
