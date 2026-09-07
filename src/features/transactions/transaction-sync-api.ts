import type { ApiResponse } from '../../types/api'
import type {
  TransactionSyncResult,
  TransactionSyncState,
} from './transaction-sync-types'

interface SyncStatusResponse {
  syncStates: TransactionSyncState[]
}

interface SyncResponse {
  sync: TransactionSyncResult
}

export function getTransactionSyncStatus(): Promise<TransactionSyncState[]> {
  return request<SyncStatusResponse>(
    '/api/sync/transactions/status',
    'GET',
  ).then((payload) => payload.syncStates)
}

export function synchronizeTransactions(): Promise<TransactionSyncResult> {
  return request<SyncResponse>('/api/sync/transactions', 'POST').then(
    (payload) => payload.sync,
  )
}

async function request<T>(path: string, method: 'GET' | 'POST'): Promise<T> {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    method,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !('data' in payload)) {
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Transaction sync is unavailable. Try again later.',
    )
  }
  return payload.data
}
