import type { ApiResponse } from '../../types/api'

import type {
  TransactionListFilters,
  TransactionCorrection,
  TransactionPage,
} from './transaction-types'

export async function getTransactions(
  filters: TransactionListFilters,
  cursor?: string,
): Promise<TransactionPage> {
  const parameters = new URLSearchParams()
  for (const accountId of filters.accountIds) {
    parameters.append('accountId', accountId)
  }
  appendParameter(parameters, 'dateFrom', filters.dateFrom)
  appendParameter(parameters, 'dateTo', filters.dateTo)
  appendParameter(parameters, 'direction', filters.direction)
  appendParameter(parameters, 'currency', filters.currency)
  appendParameter(parameters, 'category', filters.category)
  appendParameter(parameters, 'excluded', filters.excluded)
  appendParameter(parameters, 'search', filters.search)
  appendParameter(parameters, 'cursor', cursor)
  const search = parameters.toString()
  const response = await fetch(
    `/api/transactions${search ? `?${search}` : ''}`,
    {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    },
  )
  const payload = (await response.json()) as ApiResponse<TransactionPage>
  if (!response.ok || !('data' in payload)) {
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Transactions could not be loaded. Try again later.',
    )
  }
  return payload.data
}

export function saveTransactionAdjustment(
  transactionId: string,
  input: { adjustedAmountMinor: number; note: string | null },
): Promise<TransactionCorrection> {
  return mutateCorrection(transactionId, 'adjustment', 'PUT', input)
}

export function resetTransactionAdjustment(
  transactionId: string,
): Promise<TransactionCorrection> {
  return mutateCorrection(transactionId, 'adjustment', 'DELETE')
}

export function excludeTransaction(
  transactionId: string,
  reason: string | null,
): Promise<TransactionCorrection> {
  return mutateCorrection(transactionId, 'exclusion', 'PUT', { reason })
}

export function restoreTransaction(
  transactionId: string,
): Promise<TransactionCorrection> {
  return mutateCorrection(transactionId, 'exclusion', 'DELETE')
}

function appendParameter(
  parameters: URLSearchParams,
  key: string,
  value: boolean | number | string | null | undefined,
): void {
  if (value !== null && value !== undefined) {
    parameters.set(key, value.toString())
  }
}

async function mutateCorrection(
  transactionId: string,
  resource: 'adjustment' | 'exclusion',
  method: 'DELETE' | 'PUT',
  body?: object,
): Promise<TransactionCorrection> {
  const response = await fetch(
    `/api/transactions/${transactionId}/${resource}`,
    {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      method,
    },
  )
  const payload = (await response.json()) as ApiResponse<{
    correction: TransactionCorrection
  }>
  if (!response.ok || !('data' in payload)) {
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Transaction correction could not be saved. Try again later.',
    )
  }
  return payload.data.correction
}
