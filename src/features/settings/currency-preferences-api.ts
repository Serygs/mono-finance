import type { ApiResponse } from '../../types/api'

export interface CurrencyPreferences {
  baseCurrencyCode: string
}

export function getCurrencyPreferences(): Promise<CurrencyPreferences> {
  return request('/api/preferences/currency')
}

export function saveCurrencyPreferences(
  baseCurrencyCode: string,
): Promise<CurrencyPreferences> {
  return request('/api/preferences/currency', 'PUT', { baseCurrencyCode })
}

export async function synchronizeExchangeRates(): Promise<void> {
  await request('/api/exchange-rates/sync', 'POST')
}

async function request<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: object,
): Promise<T> {
  const response = await fetch(path, {
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    method,
  })
  const payload = (await response.json()) as ApiResponse<T>
  if (!response.ok || !('data' in payload)) {
    throw new Error(
      'error' in payload
        ? payload.error.message
        : 'Currency settings could not be updated.',
    )
  }
  return payload.data
}
