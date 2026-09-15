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
import { Button, SegmentedControl } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import {
  FormField,
  MultiSelect,
  SearchField,
  Select,
} from '../../components/ui/FormControls'
import { BottomSheet } from '../../components/ui/Overlay'
import { Popover } from '../../components/ui/Popover'
import { PageHeader, PageSurface } from '../../components/ui/Page'

import { TransactionDetails } from './TransactionDetails'
import {
  accountLabel,
  formatTransactionDateGroup,
  formatTransactionAmount,
  groupTransactionsByDate,
} from './transaction-formatting'
import { getVisualMappings } from '../visuals/visuals-api'
import { TransactionVisual } from '../visuals/visual-resolver'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { getTransactions } from './transactions-api'
import type {
  TransactionListFilters,
  TransactionListItem,
  TransactionPage,
} from './transaction-types'
import {
  type TranslationKey,
  useLocalization,
} from '../localization/localization'

type DatePreset =
  | '7d'
  | '30d'
  | '90d'
  | 'current-month'
  | 'previous-month'
  | 'current-year'
  | 'custom'

const DATE_PRESETS: { label: TranslationKey; value: DatePreset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'This month', value: 'current-month' },
  { label: 'Previous month', value: 'previous-month' },
  { label: 'This year', value: 'current-year' },
  { label: 'Custom range', value: 'custom' },
]

const DIRECTION_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
] as const

export function TransactionsPage() {
  const { locale, t } = useLocalization()
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
  const visualsQuery = useQuery({
    queryFn: getVisualMappings,
    queryKey: ['visuals'],
  })
  const transactions =
    transactionsQuery.data?.pages.flatMap((page) => page.transactions) ?? []
  const transactionGroups = groupTransactionsByDate(transactions)
  const dateGroupNow = new Date()
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
    <PageSurface className="transactions-page transactions-page--ledger">
      <PageHeader
        description={
          <p>
            {t(
              'Imported transactions, shaped by your adjustments and compensation links.',
            )}
          </p>
        }
        id="transactions-title"
        title={t('Transactions')}
      />

      <section
        className="transactions-toolbar"
        aria-label={t('Transaction filters')}
      >
        <SearchField
          autoComplete="off"
          className="transactions-toolbar__search"
          label={t('Search merchant or description')}
          name="transaction-search"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('Search transactions…')}
          value={search}
        />
        <DatePresetField
          className="transactions-toolbar__period"
          datePreset={datePreset}
          onChange={setDatePreset}
          t={t}
        />
        <AccountMultiSelector
          accounts={accountsQuery.data ?? []}
          className="transactions-toolbar__account"
          onChange={setAccountIds}
          selectedIds={accountIds}
        />
        <CategoryField
          categories={categories}
          className="transactions-toolbar__category"
          onChange={setCategory}
          t={t}
          value={category}
        />
        <Popover
          className="transactions-toolbar__more-filters"
          content={
            <div className="transactions-filter-popover">
              <CategoryField
                categories={categories}
                onChange={setCategory}
                t={t}
                value={category}
              />
              {datePreset === 'custom' ? (
                <CustomDateFields
                  customDateFrom={customDateFrom}
                  customDateTo={customDateTo}
                  onFromChange={setCustomDateFrom}
                  onToChange={setCustomDateTo}
                  t={t}
                />
              ) : null}
            </div>
          }
          label={t('Filters')}
        >
          <span aria-hidden="true" className="transactions-filter-icon">
            ☷
          </span>
          <span className="sr-only">{t('Filters')}</span>
        </Popover>
        {datePreset === 'custom' ? (
          <CustomDateFields
            className="transactions-toolbar__custom-dates"
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            onFromChange={setCustomDateFrom}
            onToChange={setCustomDateTo}
            t={t}
          />
        ) : null}
        <SegmentedControl
          label={t('Direction')}
          onChange={(value) => setDirection(value === 'all' ? null : value)}
          options={DIRECTION_OPTIONS.map((option) => ({
            ...option,
            label: t(option.label),
          }))}
          value={direction ?? 'all'}
        />
      </section>

      {transactionsQuery.isPending ? (
        <Skeleton label={t('Loading transactions…')} lines={5} />
      ) : null}
      {transactionsQuery.isError ? (
        <Alert tone="danger" title={t('Transactions could not be loaded')}>
          {t('Try again when the connection is available.')}
        </Alert>
      ) : null}
      {!transactionsQuery.isPending &&
      !transactionsQuery.isError &&
      transactions.length === 0 ? (
        <EmptyState title={t('No matching transactions')}>
          <p>{t('Import a transaction window or broaden the filters.')}</p>
        </EmptyState>
      ) : null}
      {transactions.length > 0 ? (
        <div className="transactions-ledger-shell">
          <div
            className="transactions-ledger"
            aria-label={t('Transactions in chronological order')}
          >
            <div className="transactions-ledger__header" aria-hidden="true">
              <span>{t('Transactions')}</span>
              <span>{t('Category')}</span>
              <span>{t('Account')}</span>
              <span>{t('Date and time')}</span>
              <span>{t('Effective amount')}</span>
              <span>{t('Actions')}</span>
            </div>
            {transactionGroups.map((group) => {
              const firstTransaction = group.transactions[0]
              if (firstTransaction === undefined) return null
              return (
                <section
                  className="transactions-date-group"
                  key={group.dateKey}
                >
                  <h2>
                    <span>
                      {formatTransactionDateGroup(group.dateKey, {
                        locale,
                        now: dateGroupNow,
                        today: t('Today'),
                        yesterday: t('Yesterday'),
                      })}
                    </span>
                    <span>{formatDateGroupAmount(group.transactions)}</span>
                  </h2>
                  {group.transactions.map((transaction) => (
                    <button
                      aria-pressed={selectedTransaction?.id === transaction.id}
                      className="transactions-ledger-row"
                      key={transaction.id}
                      onClick={() => setSelectedTransaction(transaction)}
                      type="button"
                    >
                      <span aria-hidden="true" className="transaction-avatar">
                        <TransactionVisual
                          mappings={visualsQuery.data}
                          transaction={transaction}
                        />
                      </span>
                      <span className="transactions-ledger-row__transaction">
                        <strong>{transaction.originalDescription}</strong>
                        <TransactionIndicators transaction={transaction} />
                      </span>
                      <span
                        className="transactions-ledger-row__category"
                        data-account={accountLabel(transaction)}
                      >
                        {transaction.category.name ?? t('Uncategorized')}
                      </span>
                      <span className="transactions-ledger-row__account">
                        {accountLabel(transaction)}
                      </span>
                      <span className="transactions-ledger-row__date">
                        <span className="transactions-ledger-row__desktop-time">
                          {formatTransactionClock(
                            transaction.originalTimestamp,
                          )}
                        </span>
                        <span className="transactions-ledger-row__mobile-time">
                          {formatTransactionClock(
                            transaction.originalTimestamp,
                          )}
                        </span>
                      </span>
                      <span
                        className={
                          transaction.effectiveAmountMinor < 0
                            ? 'transactions-ledger-row__amount is-expense'
                            : 'transactions-ledger-row__amount is-income'
                        }
                      >
                        {formatTransactionAmount(transaction)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="transactions-ledger-row__action"
                      >
                        •••
                      </span>
                    </button>
                  ))}
                </section>
              )
            })}
          </div>
        </div>
      ) : null}
      <BottomSheet
        onClose={() => setSelectedTransaction(null)}
        open={selectedTransaction !== null}
        title={
          selectedTransaction?.originalDescription ?? t('Transaction details')
        }
      >
        <TransactionDetails
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
                          effectiveAmountMinor: correction.effectiveAmountMinor,
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
      </BottomSheet>
      {transactionsQuery.hasNextPage ? (
        <nav className="transactions-pagination" aria-label={t('Pagination')}>
          <Button
            disabled={transactionsQuery.isFetchingNextPage}
            loading={transactionsQuery.isFetchingNextPage}
            onClick={() => void transactionsQuery.fetchNextPage()}
            type="button"
            variant="secondary"
          >
            {t(transactionsQuery.isFetchingNextPage ? 'Loading…' : 'Load more')}
          </Button>
        </nav>
      ) : null}
    </PageSurface>
  )
}

function TransactionIndicators({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const { t } = useLocalization()
  const labels = [
    transaction.hasAdjustment ? 'Adjusted' : null,
    transaction.hasCompensation ? 'Compensated' : null,
    transaction.isExcluded ? 'Excluded' : null,
  ].filter((label): label is TranslationKey => label !== null)
  return labels.length === 0 ? null : (
    <span className="transaction-indicators">
      {labels.map((label) => (
        <span key={label}>{t(label)}</span>
      ))}
    </span>
  )
}

export function TransactionCategoryVisual({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const visual = categoryVisual(transaction.category.name)
  return visual.icon === null ? (
    <span>{transaction.originalDescription.slice(0, 1)}</span>
  ) : (
    <CategoryIcon token={visual.icon} />
  )
}

function categoryVisual(category: string | null): {
  icon: Parameters<typeof CategoryIcon>[0]['token']
  tone: string
} {
  const normalized = category?.toLocaleLowerCase() ?? ''
  if (/grocer|продукт/.test(normalized)) {
    return { icon: 'groceries', tone: 'groceries' }
  }
  if (/fuel|gas|transport|палив|транспорт/.test(normalized)) {
    return { icon: 'transport', tone: 'transport' }
  }
  if (/housing|home|rent|житл|дім/.test(normalized)) {
    return { icon: 'home', tone: 'housing' }
  }
  if (/restaurant|dining|cafe|food|ресторан|кафе/.test(normalized)) {
    return { icon: 'dining', tone: 'dining' }
  }
  if (/subscription|entertainment|підпис|розваг/.test(normalized)) {
    return { icon: 'entertainment', tone: 'subscriptions' }
  }
  if (/health|medical|здоров/.test(normalized)) {
    return { icon: 'health', tone: 'health' }
  }
  if (/transfer|income|переказ|дохід/.test(normalized)) {
    return { icon: 'wallet', tone: 'transfer' }
  }
  return { icon: null, tone: 'neutral' }
}

function AccountMultiSelector({
  accounts,
  className,
  onChange,
  selectedIds,
}: {
  accounts: AccountSummary[]
  className?: string
  onChange(ids: string[]): void
  selectedIds: string[]
}) {
  const { t } = useLocalization()
  return (
    <FormField className={className ?? ''} label={t('Accounts')}>
      <MultiSelect
        ariaLabel={t('Accounts')}
        onChange={onChange}
        options={accounts.map((account) => ({
          label: `${account.type} · ${account.currency.code}`,
          value: account.id,
        }))}
        value={selectedIds}
      />
    </FormField>
  )
}

function DatePresetField({
  className,
  datePreset,
  onChange,
  t,
}: {
  className?: string
  datePreset: DatePreset
  onChange(value: DatePreset): void
  t: ReturnType<typeof useLocalization>['t']
}) {
  return (
    <FormField className={className ?? ''} label={t('Date range')}>
      <Select
        onChange={(event) => onChange(event.target.value as DatePreset)}
        value={datePreset}
      >
        {DATE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {t(preset.label)}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function CategoryField({
  categories,
  className,
  onChange,
  t,
  value,
}: {
  categories: string[]
  className?: string
  onChange(value: string | null): void
  t: ReturnType<typeof useLocalization>['t']
  value: string | null
}) {
  return (
    <FormField className={className ?? ''} label={t('Category')}>
      <Select
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ''}
      >
        <option value="">{t('All categories')}</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function CustomDateFields({
  className,
  customDateFrom,
  customDateTo,
  onFromChange,
  onToChange,
  t,
}: {
  className?: string
  customDateFrom: string
  customDateTo: string
  onFromChange(value: string): void
  onToChange(value: string): void
  t: ReturnType<typeof useLocalization>['t']
}) {
  return (
    <div
      className={['transactions-custom-dates', className]
        .filter(Boolean)
        .join(' ')}
    >
      <FormField label={t('From')}>
        <input
          autoComplete="off"
          name="transactions-from"
          onChange={(event) => onFromChange(event.target.value)}
          type="date"
          value={customDateFrom}
        />
      </FormField>
      <FormField label={t('To')}>
        <input
          autoComplete="off"
          name="transactions-to"
          onChange={(event) => onToChange(event.target.value)}
          type="date"
          value={customDateTo}
        />
      </FormField>
    </div>
  )
}

function formatDateGroupAmount(transactions: TransactionListItem[]): string {
  const [firstTransaction] = transactions
  if (
    firstTransaction === undefined ||
    transactions.some(
      (transaction) =>
        transaction.currencyCode !== firstTransaction.currencyCode ||
        transaction.currencyMinorUnit !== firstTransaction.currencyMinorUnit,
    )
  ) {
    return ''
  }
  const amountMinor = transactions.reduce(
    (sum, transaction) => sum + transaction.effectiveAmountMinor,
    0,
  )
  return new Intl.NumberFormat(undefined, {
    currency: firstTransaction.currencyCode,
    currencyDisplay: 'code',
    maximumFractionDigits: firstTransaction.currencyMinorUnit,
    minimumFractionDigits: firstTransaction.currencyMinorUnit,
    style: 'currency',
  }).format(amountMinor / 10 ** firstTransaction.currencyMinorUnit)
}

function formatTransactionClock(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
    epochSeconds * 1_000,
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
