import { describe, expect, it } from 'vitest'

import { SystemStatusService } from './system-status-service'

describe('SystemStatusService', () => {
  it('returns only aggregate, safe operational status', async () => {
    const service = new SystemStatusService(
      database({
        last_account_sync_at: 1_700_000_000,
        last_error_code: null,
        last_transaction_sync_at: 1_700_000_100,
      }),
      { frontend: '0.0.0', worker: 'worker-1' },
    )

    await expect(service.get('owner-1')).resolves.toEqual({
      database: 'healthy',
      frontendVersion: '0.0.0',
      lastAccountSyncAt: 1_700_000_000,
      lastTransactionSyncAt: 1_700_000_100,
      monobankConnectivity: 'healthy',
      workerVersion: 'worker-1',
    })
  })

  it('does not expose database errors', async () => {
    const service = new SystemStatusService(database(null, true), {
      frontend: '0.0.0',
      worker: 'worker-1',
    })
    await expect(service.get('owner-1')).resolves.toMatchObject({
      database: 'unavailable',
      monobankConnectivity: 'unknown',
    })
  })

  it('does not report Monobank as healthy before any synchronization succeeds', async () => {
    const service = new SystemStatusService(
      database({
        last_account_sync_at: null,
        last_error_code: null,
        last_transaction_sync_at: null,
      }),
      { frontend: '0.0.0', worker: 'worker-1' },
    )

    await expect(service.get('owner-1')).resolves.toMatchObject({
      monobankConnectivity: 'unknown',
    })
  })
})

function database(row: object | null, rejects = false): D1Database {
  return {
    prepare: () => ({
      bind: () => ({
        first: async () => {
          if (rejects) throw new Error('sensitive database error')
          return row
        },
      }),
    }),
  } as unknown as D1Database
}
