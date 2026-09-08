import type { ApiResponse } from '../../types/api'

export interface SystemStatus {
  database: 'healthy' | 'unavailable'
  frontendVersion: string
  lastAccountSyncAt: number | null
  lastTransactionSyncAt: number | null
  monobankConnectivity: 'degraded' | 'healthy' | 'unknown'
  workerVersion: string
}

export async function getSystemStatus(): Promise<SystemStatus> {
  const response = await fetch('/api/system/status', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  const payload = (await response.json()) as ApiResponse<SystemStatus>
  if (!response.ok || !('data' in payload)) {
    throw new Error('System status could not be loaded.')
  }
  return payload.data
}
