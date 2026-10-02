import { useQuery } from '@tanstack/react-query'
import { getAccounts } from './accounts-api'

export const accountQueryKeys = { all: ['accounts'] as const }

export function useAccountsQuery() {
  return useQuery({ queryFn: getAccounts, queryKey: accountQueryKeys.all })
}
