import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import {
  createCategory,
  deleteCategory,
  mergeCategories,
  updateCategory,
  type CategoryInput,
} from './categories-api'
import {
  refreshCategoryData,
  type useCategoriesQuery,
} from './category-queries'

export function useCategoryManagement(
  categories: ReturnType<typeof useCategoriesQuery>,
) {
  const client = useQueryClient()
  const [editing, setEditing] = useState<{
    id: string
    input: CategoryInput
  } | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [pendingMerge, setPendingMerge] = useState<{
    id: string
    name: string
  } | null>(null)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [query, setQuery] = useState('')
  const [nameInvalid, setNameInvalid] = useState(false)

  const mutation = useMutation({
    mutationFn: async (input: CategoryInput) =>
      editing === null
        ? createCategory(input)
        : updateCategory(editing.id, input),
    onSuccess: async () => {
      await refreshCategoryData(client)
      setEditing(null)
      setIsCreating(false)
    },
  })
  const removal = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await refreshCategoryData(client)
      setPendingDelete(null)
    },
  })
  const merge = useMutation({
    mutationFn: (input: {
      sourceCategoryId: string
      targetCategoryId: string
    }) => mergeCategories(input.sourceCategoryId, input.targetCategoryId),
    onSuccess: async () => {
      await refreshCategoryData(client)
      setPendingMerge(null)
      setMergeTargetId('')
    },
  })

  const visibleCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (normalizedQuery === '') return categories.data ?? []
    return (categories.data ?? []).filter((category) =>
      category.name.toLocaleLowerCase().includes(normalizedQuery),
    )
  }, [categories.data, query])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (mutation.isPending) return
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    if (name === '') {
      setNameInvalid(true)
      return
    }
    mutation.mutate({
      name,
      icon: optional(String(form.get('icon'))),
      colorToken: optional(String(form.get('colorToken'))),
    })
  }

  return {
    editing,
    setEditing,
    isCreating,
    setIsCreating,
    pendingDelete,
    setPendingDelete,
    pendingMerge,
    setPendingMerge,
    mergeTargetId,
    setMergeTargetId,
    query,
    setQuery,
    mutation,
    removal,
    merge,
    visibleCategories,
    submit,
    nameInvalid,
    setNameInvalid,
  }
}

function optional(value: string): string | null {
  return value.trim() || null
}
