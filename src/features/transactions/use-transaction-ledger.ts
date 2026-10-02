import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query'
import { useDeferredValue, useMemo, useState } from 'react'
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

export function useTransactionLedger() {
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
  const transactions =
    transactionsQuery.data?.pages.flatMap((page) => page.transactions) ?? []
  const categories = [
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
