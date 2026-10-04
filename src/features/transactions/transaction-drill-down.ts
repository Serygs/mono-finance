import type {
  TransactionListFilters,
  TransactionDirection,
} from './transaction-types'

export type CategoryIdentity =
  { kind: 'id'; id: string } | { kind: 'uncategorized' }
export interface AnalyticsTransactionContext {
  accountIds: string[]
  dateFrom: number
  dateTo: number
  currencyMode: 'original' | 'base'
  amountMode: 'effective'
  excluded: false
}

/** Converted aggregates cannot be explained by an original-currency ledger. */
export function analyticsTransactionFilters(
  context: AnalyticsTransactionContext,
  input: {
    categoryIdentity?: CategoryIdentity
    currency: string | null
    direction: TransactionDirection | null
  },
): TransactionListFilters | null {
  if (context.currencyMode !== 'original') return null
  return {
    accountIds: [...context.accountIds],
    category: null,
    ...(input.categoryIdentity === undefined
      ? {}
      : { categoryIdentity: input.categoryIdentity }),
    dateFrom: context.dateFrom,
    dateTo: context.dateTo,
    currency: input.currency,
    direction: input.direction,
    excluded: context.excluded,
    search: null,
  }
}

export function transactionFilterParameters(
  filters: TransactionListFilters,
): URLSearchParams {
  const result = new URLSearchParams()
  for (const id of filters.accountIds) result.append('accountId', id)
  for (const key of [
    'dateFrom',
    'dateTo',
    'direction',
    'currency',
    'category',
    'excluded',
    'search',
  ] as const) {
    const value = filters[key]
    if (value !== null) result.set(key, String(value))
  }
  if (filters.categoryIdentity?.kind === 'id')
    result.set('categoryId', filters.categoryIdentity.id)
  if (filters.categoryIdentity?.kind === 'uncategorized')
    result.set('uncategorized', 'true')
  for (const key of ['hasAdjustment', 'hasCompensation'] as const) {
    if (filters[key] !== undefined) result.set(key, String(filters[key]))
  }
  return result
}

export function transactionDrillDownUrl(
  filters: TransactionListFilters,
  presentation: { categoryLabel?: string } = {},
): string {
  const parameters = transactionFilterParameters(filters)
  // A label is a presentation hint only; server query identity remains categoryId.
  if (presentation.categoryLabel !== undefined)
    parameters.set('categoryLabel', presentation.categoryLabel)
  parameters.set('accountScope', 'explicit')
  parameters.set('period', 'custom')
  return `/transactions?${parameters}`
}
