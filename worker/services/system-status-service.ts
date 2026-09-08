export interface SystemStatus {
  database: 'healthy' | 'unavailable'
  frontendVersion: string
  lastAccountSyncAt: number | null
  lastTransactionSyncAt: number | null
  monobankConnectivity: 'degraded' | 'healthy' | 'unknown'
  workerVersion: string
}

interface SystemStatusRow {
  last_account_sync_at: number | null
  last_error_code: string | null
  last_transaction_sync_at: number | null
}

export class SystemStatusService {
  private readonly database: D1Database
  private readonly versions: { frontend: string; worker: string }

  constructor(
    database: D1Database,
    versions: { frontend: string; worker: string },
  ) {
    this.database = database
    this.versions = versions
  }

  async get(userId: string): Promise<SystemStatus> {
    try {
      const result = await this.database
        .prepare(
          `SELECT
             (SELECT MAX(updated_at) FROM accounts WHERE user_id = ?) AS last_account_sync_at,
             (SELECT MAX(last_successful_sync_at) FROM sync_state
                INNER JOIN accounts ON accounts.id = sync_state.account_id
                WHERE accounts.user_id = ?) AS last_transaction_sync_at,
             (SELECT last_error_code FROM sync_state
                INNER JOIN accounts ON accounts.id = sync_state.account_id
                WHERE accounts.user_id = ? AND last_error_code IS NOT NULL
                ORDER BY sync_state.updated_at DESC LIMIT 1) AS last_error_code`,
        )
        .bind(userId, userId, userId)
        .first<SystemStatusRow>()
      return {
        database: 'healthy',
        frontendVersion: this.versions.frontend,
        lastAccountSyncAt: result?.last_account_sync_at ?? null,
        lastTransactionSyncAt: result?.last_transaction_sync_at ?? null,
        monobankConnectivity:
          result?.last_error_code === null ||
          result?.last_error_code === undefined
            ? 'healthy'
            : 'degraded',
        workerVersion: this.versions.worker,
      }
    } catch {
      return {
        database: 'unavailable',
        frontendVersion: this.versions.frontend,
        lastAccountSyncAt: null,
        lastTransactionSyncAt: null,
        monobankConnectivity: 'unknown',
        workerVersion: this.versions.worker,
      }
    }
  }
}
