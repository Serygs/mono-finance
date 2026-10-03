import { useFinanceViewHistory } from '../../lib/use-finance-view-history'
import { useSearchParams } from 'react-router'
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query'
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useOptimistic,
  useRef,
} from 'react'
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
  const [urlParameters, setParameters] = useSearchParams()
  const [parameters, setOptimisticParameters] = useOptimistic(urlParameters)
  const pendingParameters = useRef(parameters)
  useEffect(() => {
    pendingParameters.current = parameters
  }, [parameters])
  function update(values: Record<string, string | string[] | null>) {
    const next = new URLSearchParams(pendingParameters.current)
    for (const [key, value] of Object.entries(values)) {
      next.delete(key)
      for (const item of value === null
        ? []
        : Array.isArray(value)
          ? value
          : [value])
        next.append(key, item)
    }
    pendingParameters.current = next
    startTransition(() => {
      setOptimisticParameters(next)
      setParameters(next, {
        replace: true,
        preventScrollReset: true,
        state: window.history.state?.usr,
      })
    })
  }
  const datePreset = (parameters.get('period') ??
    '30d') as TransactionDatePreset
  const customDateFrom =
    parameters.get('from') ?? epochInput(parameters.get('dateFrom'))
  const customDateTo =
    parameters.get('to') ?? epochInput(parameters.get('dateTo'))
  const parameterKey = parameters.toString()
  const accountIds = useMemo(() => {
    const values = new URLSearchParams(parameterKey)
    return values.has('accountScope')
      ? values.getAll('accountId')
      : loadSelectedAccounts()
  }, [parameterKey])
  const category = parameters.get('category')
  const categoryIdentity = useMemo(
    () =>
      parameters.has('categoryId')
        ? { kind: 'id' as const, id: parameters.get('categoryId')! }
        : parameters.get('uncategorized') === 'true'
          ? { kind: 'uncategorized' as const }
          : undefined,
    [parameters],
  )
  const currency = parameters.get('currency')
  const excluded = parameters.has('excluded')
    ? parameters.get('excluded') === 'true'
    : null
  const direction: 'income' | 'expense' | null =
    parameters.get('direction') === 'income'
      ? 'income'
      : parameters.get('direction') === 'expense'
        ? 'expense'
        : null
  const search = parameters.get('search') ?? ''
  const setDatePreset = (value: TransactionDatePreset) =>
    update({ period: value, dateFrom: null, dateTo: null })
  const setCustomDateFrom = (value: string) =>
    update({ from: value, dateFrom: null })
  const setCustomDateTo = (value: string) => update({ to: value, dateTo: null })
  const setAccountIds = (value: string[]) =>
    update({ accountId: value, accountScope: 'explicit' })
  const setCategory = (value: string | null) =>
    update({
      category: value,
      categoryId: null,
      categoryLabel: null,
      uncategorized: null,
    })
  const setCurrency = (value: string | null) => update({ currency: value })
  const setExcluded = (value: boolean | null) =>
    update({ excluded: value === null ? null : String(value) })
  const setDirection = (value: 'expense' | 'income' | null) =>
    update({ direction: value })
  const setSearch = (value: string) => update({ search: value || null })
  const deferredSearch = useDeferredValue(search.trim())
  const accountsQuery = useAccountsQuery()
  const customCategoriesQuery = useCategoriesQuery()
  const dateRange = useMemo(() => {
    const range = resolveTransactionDateRange(
      datePreset,
      customDateFrom,
      customDateTo,
    )
    return {
      from: epochValue(parameters.get('dateFrom')) ?? range.from,
      to: epochValue(parameters.get('dateTo')) ?? range.to,
    }
  }, [customDateFrom, customDateTo, datePreset, parameters])
  const filters = useMemo<TransactionListFilters>(
    () => ({
      accountIds,
      category,
      currency,
      ...(categoryIdentity === undefined ? {} : { categoryIdentity }),
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      direction,
      excluded,
      search: deferredSearch || null,
    }),
    [
      accountIds,
      category,
      categoryIdentity,
      currency,
      dateRange,
      deferredSearch,
      direction,
      excluded,
    ],
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
  const previousFilters = useRef(filters)
  useEffect(() => {
    if (previousFilters.current === filters) return
    previousFilters.current = filters
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
  useFinanceViewHistory(null, !transactionsQuery.isPending)
  const transactions = loadedTransactions(transactionsQuery.data?.pages ?? [])
  const searchPending = search.trim() !== deferredSearch
  const activeFilterCount =
    Number(category !== null || categoryIdentity !== undefined) +
    Number(currency !== null) +
    Number(excluded !== null)
  const categoryLabel =
    category ??
    (categoryIdentity?.kind === 'id'
      ? (transactions.find((item) => item.category.id === categoryIdentity.id)
          ?.category.name ??
        customCategoriesQuery.data?.find(
          (item) => item.id === categoryIdentity.id,
        )?.name ??
        parameters.get('categoryLabel') ??
        null)
      : null)

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
    categoryIdentity,
    categoryLabel,
    setCategory,
    currency,
    setCurrency,
    excluded,
    setExcluded,
    filters,
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
    isFiltered:
      activeFilterCount > 0 ||
      accountIds.length > 0 ||
      direction !== null ||
      search.trim() !== '',
    selectionScope: JSON.stringify({ ...filters, search: search.trim() }),
    resetFilters() {
      update({
        category: null,
        categoryId: null,
        categoryLabel: null,
        uncategorized: null,
        currency: null,
        excluded: null,
      })
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

function epochValue(value: string | null): number | null {
  return value !== null &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value))
    ? Number(value)
    : null
}
function epochInput(value: string | null): string {
  const epoch = epochValue(value)
  if (epoch === null) return ''
  const date = new Date(epoch * 1000)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
