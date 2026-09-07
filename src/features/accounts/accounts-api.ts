import type { ApiResponse } from '../../types/api'
import type { AccountSummary } from './account-types'

interface AccountsResponse {
  accounts: AccountSummary[]
}

export function getAccounts(): Promise<AccountSummary[]> {
  return requestAccounts('/api/accounts', 'GET')
}

export function synchronizeAccounts(): Promise<AccountSummary[]> {
  return requestAccounts('/api/sync/accounts', 'POST')
}

async function requestAccounts(
  path: string,
  method: 'GET' | 'POST',
): Promise<AccountSummary[]> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    method,
  })
  const payload = (await response.json()) as ApiResponse<AccountsResponse>
  if (!response.ok || !('data' in payload)) {
    const message =
      'error' in payload
        ? payload.error.message
        : 'Accounts could not be loaded. Try again later.'
    throw new Error(message)
  }
  return payload.data.accounts
}
