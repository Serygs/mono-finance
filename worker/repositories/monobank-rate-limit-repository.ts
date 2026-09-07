import type {
  MonobankRateLimitReservation,
  MonobankRateLimitStore,
} from '../monobank/rate-limit'

interface NextAllowedRow {
  next_allowed_at: number
}

export class D1MonobankRateLimitStore implements MonobankRateLimitStore {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async reserve(
    scope: string,
    nowEpochSeconds: number,
    minimumIntervalSeconds: number,
  ): Promise<MonobankRateLimitReservation> {
    const nextAllowedAt = nowEpochSeconds + minimumIntervalSeconds
    const reserved = await this.database
      .prepare(
        `INSERT INTO monobank_api_rate_limits (
           scope, next_allowed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?)
         ON CONFLICT(scope) DO UPDATE SET
           next_allowed_at = excluded.next_allowed_at,
           updated_at = excluded.updated_at
         WHERE monobank_api_rate_limits.next_allowed_at <= ?
         RETURNING next_allowed_at`,
      )
      .bind(
        scope,
        nextAllowedAt,
        nowEpochSeconds,
        nowEpochSeconds,
        nowEpochSeconds,
      )
      .first<NextAllowedRow>()

    if (reserved !== null) {
      return {
        acquired: true,
        nextAllowedAtEpochSeconds: reserved.next_allowed_at,
      }
    }

    const existing = await this.database
      .prepare(
        `SELECT next_allowed_at
         FROM monobank_api_rate_limits
         WHERE scope = ?`,
      )
      .bind(scope)
      .first<NextAllowedRow>()

    return {
      acquired: false,
      nextAllowedAtEpochSeconds: existing?.next_allowed_at ?? nextAllowedAt,
    }
  }

  async defer(scope: string, nextAllowedAtEpochSeconds: number): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO monobank_api_rate_limits (scope, next_allowed_at)
         VALUES (?, ?)
         ON CONFLICT(scope) DO UPDATE SET
           next_allowed_at = MAX(
             monobank_api_rate_limits.next_allowed_at,
             excluded.next_allowed_at
           ),
           updated_at = unixepoch()`,
      )
      .bind(scope, nextAllowedAtEpochSeconds)
      .run()
  }
}
