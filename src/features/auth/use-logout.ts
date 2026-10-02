import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { useAuth } from './auth-context'

const mutationKey = ['logout']

// Both session actions use the provider's existing API and encrypted-cache cleanup.
export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const client = useQueryClient()
  const mutation = useMutation({
    mutationKey,
    mutationFn: logout,
    retry: false,
    onSuccess: () => navigate('/login', { replace: true }),
  })
  const states = useMutationState({
    filters: { mutationKey },
    select: (entry) => entry.state.status,
  })
  return {
    pending: states.includes('pending'),
    failed: states.at(-1) === 'error',
    signOut: () => {
      if (client.isMutating({ mutationKey }) === 0) mutation.mutate()
    },
  }
}
