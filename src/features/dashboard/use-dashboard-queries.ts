import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'
import { getCurrencyPreferences } from '../settings/currency-preferences-api'
import { settingsQueryKeys } from '../settings/settings-query-keys'
import type { TransactionListFilters } from '../transactions/transaction-types'
import { getTransactions } from '../transactions/transactions-api'
import { getDashboardAnalytics } from './analytics-api'
import type { useDashboardFilters } from './use-dashboard-filters'

export function useDashboardQueries({
  accountIds,
  range,
  mode,
  currency,
}: Pick<
  ReturnType<typeof useDashboardFilters>,
  'accountIds' | 'range' | 'mode' | 'currency'
>) {
  const currencies = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: settingsQueryKeys.currency,
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
    queryKey: dashboardQueryKeys.analyticsFor(analyticsFilters),
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
    queryKey: dashboardQueryKeys.recentFor(transactionFilters),
  })
  const corrections = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () =>
      getTransactions(
        { ...transactionFilters, hasAdjustment: true },
        undefined,
        5,
      ),
    queryKey: dashboardQueryKeys.correctionsFor(transactionFilters),
  })
  const compensations = useQuery({
    enabled: analyticsFilters !== null,
    queryFn: () =>
      getTransactions(
        { ...transactionFilters, hasCompensation: true },
        undefined,
        5,
      ),
    queryKey: dashboardQueryKeys.compensationsFor(transactionFilters),
  })
  return { currencies, analytics, recent, corrections, compensations }
}
