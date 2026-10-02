import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { loadAccountFilter } from '../accounts/account-filter-storage'
import { useAccountsQuery } from '../accounts/account-queries'
import { useCategoriesQuery } from '../categories/category-queries'
import {
  resolveTransactionDateRange,
  type TransactionDatePreset,
} from './transaction-filter-data'
import { transactionQueryKeys } from './transaction-queries'
import type {
  TransactionListFilters,
  TransactionPage,
} from './transaction-types'
import { getTransactions } from './transactions-api'
import { loadedTransactions } from './transaction-ledger-data'

export function useTransactionLedger() {
  const queryClient = useQueryClient()
  const [datePreset, setDatePreset] = useState<TransactionDatePreset>('30d')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [accountIds, setAccountIds] = useState(loadSelectedAccounts)
  const [category, setCategory] = useState<string | null>(null)
  const [direction, setDirection] = useState<'income' | 'expense' | null>(null)
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const accountsQuery = useAccountsQuery()
  const customCategoriesQuery = useCategoriesQuery()
  const dateRange = useMemo(
    () => resolveTransactionDateRange(datePreset, customDateFrom, customDateTo),
    [customDateFrom, customDateTo, datePreset],
  )
  const filters = useMemo<TransactionListFilters>(
    () => ({
      accountIds,
      category,
      currency: null,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      direction,
      excluded: null,
      search: deferredSearch || null,
    }),
    [accountIds, category, dateRange, deferredSearch, direction],
  )
  const transactionsQuery = useInfiniteQuery<
    TransactionPage,
    Error,
    InfiniteData<TransactionPage>,
    readonly ['transactions', TransactionListFilters],
    string | undefined
  >({
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => getTransactions(filters, pageParam),
    queryKey: transactionQueryKeys.list(filters),
  })
  // Changing criteria starts at the first cursor page, including a filter with
  // cached pages. Mutations and loading more leave the current pages intact.
  useEffect(() => {
    queryClient.setQueryData<InfiniteData<TransactionPage>>(
      transactionQueryKeys.list(filters),
      (current) =>
        current === undefined || current.pages.length <= 1
          ? current
          : {
              ...current,
              pages: current.pages.slice(0, 1),
              pageParams: current.pageParams.slice(0, 1),
            },
    )
  }, [filters, queryClient])
  const transactions = loadedTransactions(transactionsQuery.data?.pages ?? [])
  const searchPending = search.trim() !== deferredSearch
  const activeFilterCount = [
    accountIds.length > 0,
    category !== null,
    direction !== null,
    search.trim() !== '',
    datePreset !== '30d',
  ].filter(Boolean).length
  const categories = [
    ...(category === null ? [] : [category]),
    ...(customCategoriesQuery.data ?? []).map((item) => item.name),
    ...new Set(
      transactions.flatMap((transaction) =>
        transaction.category.name === null ? [] : [transaction.category.name],
      ),
    ),
  ]
    .filter((item, index, values) => values.indexOf(item) === index)
    .sort()

  return {
    datePreset,
    setDatePreset,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    accountIds,
    setAccountIds,
    category,
    setCategory,
    direction,
    setDirection,
    search,
    setSearch,
    accountsQuery,
    transactionsQuery,
    transactions,
    categories,
    customCategoriesQuery,
    searchPending,
    activeFilterCount,
    selectionScope: JSON.stringify({ ...filters, search: search.trim() }),
    resetFilters() {
      setDatePreset('30d')
      setCustomDateFrom('')
      setCustomDateTo('')
      setAccountIds([])
      setCategory(null)
      setDirection(null)
      setSearch('')
    },
  }
}
function loadSelectedAccounts(): string[] {
  try {
    const filter = loadAccountFilter(window.localStorage)
    return filter.mode === 'selected' ? filter.accountIds : []
  } catch {
    return []
  }
}
