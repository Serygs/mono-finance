import type { QueryClient } from '@tanstack/react-query'
import type { TransactionListFilters } from './transaction-types'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  syncStatus: ['transaction-sync-status'] as const,
  list: (filters: TransactionListFilters) => ['transactions', filters] as const,
  compensations: (transactionId: string) =>
    ['compensations', transactionId] as const,
}

// Corrections affect the ledger and financial projections, not account balances
// or category definitions. Inactive views are marked stale for their next visit.
export function refreshTransactionLedger(client: QueryClient) {
  return Promise.all([
    client.invalidateQueries({ queryKey: transactionQueryKeys.all }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.recent }),
    client.invalidateQueries({ queryKey: dashboardQueryKeys.analytics }),
  ])
}

export function refreshCompensationDetails(
  client: QueryClient,
  transactionId: string,
) {
  return client.invalidateQueries({
    queryKey: transactionQueryKeys.compensations(transactionId),
  })
}
