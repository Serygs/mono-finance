const ACCOUNT_FILTER_STORAGE_KEY = 'mono-finance:account-filter:v1'

export type AccountFilter =
  { mode: 'all' } | { mode: 'selected'; accountIds: string[] }

const ALL_ACCOUNTS: AccountFilter = { mode: 'all' }

export function loadAccountFilter(storage: Storage): AccountFilter {
  try {
    const value = storage.getItem(ACCOUNT_FILTER_STORAGE_KEY)
    if (value === null) {
      return ALL_ACCOUNTS
    }

    const parsed = JSON.parse(value) as unknown
    return isAccountFilter(parsed) ? parsed : ALL_ACCOUNTS
  } catch {
    return ALL_ACCOUNTS
  }
}

export function saveAccountFilter(
  storage: Storage,
  filter: AccountFilter,
): void {
  try {
    storage.setItem(ACCOUNT_FILTER_STORAGE_KEY, JSON.stringify(filter))
  } catch {
    // The filter remains usable in memory when browser storage is unavailable.
  }
}

export function toggleAccountFilter(
  filter: AccountFilter,
  accountId: string,
): AccountFilter {
  if (filter.mode === 'all') {
    return { mode: 'selected', accountIds: [accountId] }
  }

  if (!filter.accountIds.includes(accountId)) {
    return {
      mode: 'selected',
      accountIds: filter.accountIds.concat(accountId),
    }
  }

  if (filter.accountIds.length === 1) {
    return filter
  }

  return {
    mode: 'selected',
    accountIds: filter.accountIds.filter((id) => id !== accountId),
  }
}

function isAccountFilter(value: unknown): value is AccountFilter {
  if (typeof value !== 'object' || value === null || !('mode' in value)) {
    return false
  }
  if (value.mode === 'all') {
    return true
  }
  if (
    value.mode !== 'selected' ||
    !('accountIds' in value) ||
    !Array.isArray(value.accountIds) ||
    value.accountIds.length === 0
  ) {
    return false
  }

  return value.accountIds.every(
    (accountId) => typeof accountId === 'string' && accountId.length > 0,
  )
}
