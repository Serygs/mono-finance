import type { QueryClient } from '@tanstack/react-query'
import type { TransactionListFilters } from './transaction-types'

export const transactionQueryKeys = {
  all: ['transactions'] as const,
  syncStatus: ['transaction-sync-status'] as const,
  list: (filters: TransactionListFilters) => ['transactions', filters] as const,
  compensations: (transactionId: string) =>
    ['compensations', transactionId] as const,
}

// Keep the existing correction and compensation refresh boundaries explicit.
export function refreshTransactionLedger(client: QueryClient) {
  return client.invalidateQueries({ queryKey: transactionQueryKeys.all })
}

export function refreshCompensationDetails(
  client: QueryClient,
  transactionId: string,
) {
  return client.invalidateQueries({
    queryKey: transactionQueryKeys.compensations(transactionId),
  })
}
