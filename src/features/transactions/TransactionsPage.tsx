import { useDeferredValue, useMemo, useState } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
} from '@tanstack/react-query'

import { loadAccountFilter } from '../accounts/account-filter-storage'
import { getAccounts } from '../accounts/accounts-api'
import type { AccountSummary } from '../accounts/account-types'
import { getCategories } from '../categories/categories-api'

import { TransactionDetails } from './TransactionDetails'
import {
  accountLabel,
  formatTransactionAmount,
  formatTransactionTime,
} from './transaction-formatting'
import { getTransactions } from './transactions-api'
import type {
  TransactionListFilters,
  TransactionListItem,
  TransactionPage,
} from './transaction-types'

type DatePreset =
  | '7d'
  | '30d'
  | '90d'
  | 'current-month'
  | 'previous-month'
  | 'current-year'
  | 'custom'

const DATE_PRESETS: { label: string; value: DatePreset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'This month', value: 'current-month' },
  { label: 'Previous month', value: 'previous-month' },
  { label: 'This year', value: 'current-year' },
  { label: 'Custom range', value: 'custom' },
]

export function TransactionsPage() {
  const [datePreset, setDatePreset] = useState<DatePreset>('30d')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [accountIds, setAccountIds] = useState(loadSelectedAccounts)
  const [category, setCategory] = useState<string | null>(null)
  const [direction, setDirection] = useState<'income' | 'expense' | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionListItem | null>(null)
  const deferredSearch = useDeferredValue(search.trim())
  const accountsQuery = useQuery({
    queryFn: getAccounts,
    queryKey: ['accounts'],
  })
  const customCategoriesQuery = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const dateRange = useMemo(
    () => resolveDateRange(datePreset, customDateFrom, customDateTo),
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
    queryKey: ['transactions', filters] as const,
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

  return (
    <section className="transactions-page" aria-labelledby="transactions-title">
      <header className="transactions-intro">
        <div>
          <p className="eyebrow">Ledger</p>
          <h1 id="transactions-title">Transactions</h1>
          <p className="page-description">
            Your imported bank records, in order. Adjustments and relationships
            remain visible without rewriting the original entry.
          </p>
        </div>
      </header>

      <section className="transaction-filters" aria-label="Transaction filters">
        <label className="transaction-search">
          <span>Search merchant or description</span>
          <input
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions"
            type="search"
            value={search}
          />
        </label>
        <div className="filter-field">
          <span>Date range</span>
          <select
            onChange={(event) =>
              setDatePreset(event.target.value as DatePreset)
            }
            value={datePreset}
          >
            {DATE_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        {datePreset === 'custom' ? (
          <div className="custom-date-fields">
            <label>
              From
              <input
                onChange={(event) => setCustomDateFrom(event.target.value)}
                type="date"
                value={customDateFrom}
              />
            </label>
            <label>
              To
              <input
                onChange={(event) => setCustomDateTo(event.target.value)}
                type="date"
                value={customDateTo}
              />
            </label>
          </div>
        ) : null}
        <fieldset className="direction-filter">
          <legend>Direction</legend>
          <button
            aria-pressed={direction === null}
            onClick={() => setDirection(null)}
            type="button"
          >
            All
          </button>
          <button
            aria-pressed={direction === 'expense'}
            onClick={() => setDirection('expense')}
            type="button"
          >
            Expenses
          </button>
          <button
            aria-pressed={direction === 'income'}
            onClick={() => setDirection('income')}
            type="button"
          >
            Income
          </button>
        </fieldset>
        <label className="filter-field">
          <span>Category</span>
          <select
            onChange={(event) => setCategory(event.target.value || null)}
            value={category ?? ''}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <AccountMultiSelector
          accounts={accountsQuery.data ?? []}
          selectedIds={accountIds}
          onChange={setAccountIds}
        />
      </section>

      {transactionsQuery.isPending ? (
        <p className="transaction-state" role="status">
          Loading transactions…
        </p>
      ) : null}
      {transactionsQuery.isError ? (
        <p className="transaction-state transaction-state-error" role="alert">
          Transactions could not be loaded. Try again later.
        </p>
      ) : null}
      {!transactionsQuery.isPending &&
      !transactionsQuery.isError &&
      transactions.length === 0 ? (
        <p className="transaction-state">
          No transactions match these filters. Import a transaction window or
          broaden the filters.
        </p>
      ) : null}
      {transactions.length > 0 ? (
        <div className="transaction-layout">
          <ol
            className="transaction-list"
            aria-label="Transactions in chronological order"
          >
            {transactions.map((transaction) => (
              <li key={transaction.id}>
                <button
                  className="transaction-row"
                  onClick={() => setSelectedTransaction(transaction)}
                  type="button"
                >
                  <span className="transaction-main">
                    <strong>{transaction.originalDescription}</strong>
                    <span>
                      {formatTransactionTime(transaction.originalTimestamp)} ·{' '}
                      {accountLabel(transaction)}
                    </span>
                  </span>
                  <span className="transaction-meta">
                    <span
                      className={
                        transaction.effectiveAmountMinor < 0
                          ? 'transaction-amount expense'
                          : 'transaction-amount income'
                      }
                    >
                      {formatTransactionAmount(transaction)}
                    </span>
                    <span className="transaction-category">
                      {transaction.category.name ?? 'Uncategorized'}
                    </span>
                    <TransactionIndicators transaction={transaction} />
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <TransactionDetails
            onClose={() => setSelectedTransaction(null)}
            onTransactionUpdated={(correction, metadata) =>
              setSelectedTransaction((current) =>
                current === null || current.id !== correction.id
                  ? current
                  : {
                      ...current,
                      ...metadata,
                      ...(correction.effectiveAmountMinor === undefined
                        ? {}
                        : {
                            effectiveAmountMinor:
                              correction.effectiveAmountMinor,
                          }),
                      ...(correction.hasAdjustment === undefined
                        ? {}
                        : { hasAdjustment: correction.hasAdjustment }),
                      ...(correction.isExcluded === undefined
                        ? {}
                        : { isExcluded: correction.isExcluded }),
                    },
              )
            }
            transaction={selectedTransaction}
          />
        </div>
      ) : null}
      {transactionsQuery.hasNextPage ? (
        <button
          className="load-more-button"
          disabled={transactionsQuery.isFetchingNextPage}
          onClick={() => void transactionsQuery.fetchNextPage()}
          type="button"
        >
          {transactionsQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </section>
  )
}

function TransactionIndicators({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const labels = [
    transaction.hasAdjustment ? 'Adjusted' : null,
    transaction.hasCompensation ? 'Compensated' : null,
    transaction.isExcluded ? 'Excluded' : null,
  ].filter((label): label is string => label !== null)
  return labels.length === 0 ? null : (
    <span className="transaction-indicators">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </span>
  )
}

function AccountMultiSelector({
  accounts,
  onChange,
  selectedIds,
}: {
  accounts: AccountSummary[]
  onChange(ids: string[]): void
  selectedIds: string[]
}) {
  return (
    <label className="filter-field">
      <span>Accounts</span>
      <select
        multiple
        onChange={(event) =>
          onChange(
            [...event.target.selectedOptions].map((option) => option.value),
          )
        }
        value={selectedIds}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.type} · {account.currency.code}
          </option>
        ))}
      </select>
    </label>
  )
}

function loadSelectedAccounts(): string[] {
  try {
    const filter = loadAccountFilter(window.localStorage)
    return filter.mode === 'selected' ? filter.accountIds : []
  } catch {
    return []
  }
}

function resolveDateRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
) {
  const now = new Date()
  const endOfToday =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() /
      1_000 -
    1
  if (preset === 'custom')
    return {
      from: dateInputToEpoch(customFrom),
      to: endDateInputToEpoch(customTo),
    }
  if (preset === 'current-month')
    return {
      from: localEpoch(now.getFullYear(), now.getMonth(), 1),
      to: endOfToday,
    }
  if (preset === 'previous-month')
    return {
      from: localEpoch(now.getFullYear(), now.getMonth() - 1, 1),
      to: localEpoch(now.getFullYear(), now.getMonth(), 1) - 1,
    }
  if (preset === 'current-year')
    return { from: localEpoch(now.getFullYear(), 0, 1), to: endOfToday }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { from: endOfToday - (days * 86_400 - 1), to: endOfToday }
}

function dateInputToEpoch(value: string): number | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.getTime() / 1_000
}

function endDateInputToEpoch(value: string): number | null {
  const epoch = dateInputToEpoch(value)
  return epoch === null ? null : epoch + 86_399
}

function localEpoch(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime() / 1_000
}
