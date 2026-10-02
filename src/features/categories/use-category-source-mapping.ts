import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import {
  resetCategorySourceMapping,
  saveCategorySourceMapping,
} from './categories-api'
import { refreshCategorySourceMapping } from './category-queries'

export function useCategorySourceMapping(sourceCode: string) {
  const client = useQueryClient()
  const mutationKey = ['category-source-save', sourceCode]
  const mutation = useMutation({
    mutationKey,
    mutationFn: (id: string) =>
      id === ''
        ? resetCategorySourceMapping(sourceCode)
        : saveCategorySourceMapping(sourceCode, id),
    onSuccess: () => refreshCategorySourceMapping(client),
  })
  // Row remounts during search/paging must retain the same pending/error state.
  const states = useMutationState({
    filters: { mutationKey },
    select: (value) => ({
      status: value.state.status,
      categoryId:
        typeof value.state.variables === 'string'
          ? value.state.variables
          : undefined,
    }),
  })
  const latest = states.at(-1)
  function save(id: string) {
    if (client.isMutating({ mutationKey }) === 0) mutation.mutate(id)
  }
  return {
    pending: states.some((state) => state.status === 'pending'),
    failed: latest?.status === 'error',
    succeeded: latest?.status === 'success',
    save,
    retry: () => {
      if (latest?.categoryId !== undefined) save(latest.categoryId)
    },
  }
}
