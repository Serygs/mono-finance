import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { synchronizeAccounts } from './accounts-api'
import { accountQueryKeys } from './account-queries'

const mutationKey = ['sync-accounts']

export function useAccountSync() {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationKey,
    mutationFn: synchronizeAccounts,
    retry: false,
    // An older GET must not overwrite the successful sync response.
    onMutate: () => client.cancelQueries({ queryKey: accountQueryKeys.all }),
    onSuccess: (accounts) =>
      client.setQueryData(accountQueryKeys.all, accounts),
  })
  const states = useMutationState({
    filters: { mutationKey },
    select: (entry) => entry.state.status,
  })
  const latest = states.at(-1)
  return {
    isPending: states.includes('pending'),
    isError: latest === 'error',
    isSuccess: latest === 'success',
    sync: () => {
      if (navigator.onLine && client.isMutating({ mutationKey }) === 0)
        mutation.mutate()
    },
  }
}
