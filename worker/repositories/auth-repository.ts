import type { AuthRepository } from '../auth/auth-service'

interface UserRow {
  email: string
  id: string
  password_hash: string
}

interface SessionRow {
  expires_at: number
  id: string
  revoked_at: number | null
  user_id: string
}

interface LoginAttemptRow {
  failed_attempts: number
  locked_until: number | null
  window_started_at: number
}

export class D1AuthRepository implements AuthRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async clearLoginAttempts(identifierHash: string): Promise<void> {
    await this.database
      .prepare('DELETE FROM login_rate_limits WHERE identifier_hash = ?')
      .bind(identifierHash)
      .run()
  }

  async countUsers(): Promise<number> {
    const row = await this.database
      .prepare('SELECT COUNT(*) AS count FROM users')
      .first<{ count: number }>()
    return row?.count ?? 0
  }

  async createOwner(user: {
    email: string
    id: string
    passwordHash: string
  }): Promise<boolean> {
    const result = await this.database
      .prepare(
        `INSERT INTO users (id, email, password_hash)
         VALUES (?, ?, ?)
         ON CONFLICT DO NOTHING`,
      )
      .bind(user.id, user.email, user.passwordHash)
      .run()
    return result.meta.changes === 1
  }

  async createSession(session: {
    expiresAt: number
    id: string
    tokenHash: string
    userId: string
  }): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at)
         VALUES (?, ?, ?, ?)`,
      )
      .bind(session.id, session.userId, session.tokenHash, session.expiresAt)
      .run()
  }

  async findLoginAttempt(identifierHash: string) {
    const row = await this.database
      .prepare(
        `SELECT failed_attempts, locked_until, window_started_at
         FROM login_rate_limits
         WHERE identifier_hash = ?`,
      )
      .bind(identifierHash)
      .first<LoginAttemptRow>()
    return row === null ? null : mapLoginAttempt(row)
  }

  async findSessionByTokenHash(tokenHash: string) {
    const row = await this.database
      .prepare(
        `SELECT id, user_id, expires_at, revoked_at
         FROM sessions
         WHERE token_hash = ?`,
      )
      .bind(tokenHash)
      .first<SessionRow>()
    return row === null ? null : mapSession(row)
  }

  async findUserByEmail(email: string) {
    const row = await this.database
      .prepare(
        `SELECT id, email, password_hash
         FROM users
         WHERE email = ? COLLATE NOCASE`,
      )
      .bind(email)
      .first<UserRow>()
    return row === null ? null : mapUser(row)
  }

  async findUserById(id: string) {
    const row = await this.database
      .prepare(
        `SELECT id, email
         FROM users
         WHERE id = ?`,
      )
      .bind(id)
      .first<{ email: string; id: string }>()
    return row
  }

  async recordFailedLogin(
    identifierHash: string,
    now: number,
    windowSeconds: number,
    maxAttempts: number,
    lockSeconds: number,
  ): Promise<void> {
    const resetBefore = now - windowSeconds
    const lockedUntil = now + lockSeconds
    await this.database
      .prepare(
        `INSERT INTO login_rate_limits (
           id, identifier_hash, window_started_at, failed_attempts, locked_until, updated_at
         ) VALUES (?, ?, ?, 1, NULL, ?)
         ON CONFLICT(identifier_hash) DO UPDATE SET
           window_started_at = CASE
             WHEN login_rate_limits.window_started_at <= ? THEN excluded.window_started_at
             ELSE login_rate_limits.window_started_at
           END,
           failed_attempts = CASE
             WHEN login_rate_limits.window_started_at <= ? THEN 1
             ELSE login_rate_limits.failed_attempts + 1
           END,
           locked_until = CASE
             WHEN (CASE
               WHEN login_rate_limits.window_started_at <= ? THEN 1
               ELSE login_rate_limits.failed_attempts + 1
             END) >= ? THEN ?
             ELSE NULL
           END,
           updated_at = excluded.updated_at`,
      )
      .bind(
        crypto.randomUUID(),
        identifierHash,
        now,
        now,
        resetBefore,
        resetBefore,
        resetBefore,
        maxAttempts,
        lockedUntil,
      )
      .run()
  }

  async revokeSession(tokenHash: string, revokedAt: number): Promise<void> {
    await this.database
      .prepare(
        `UPDATE sessions
         SET revoked_at = ?, updated_at = ?
         WHERE token_hash = ? AND revoked_at IS NULL`,
      )
      .bind(revokedAt, revokedAt, tokenHash)
      .run()
  }
}

function mapLoginAttempt(row: LoginAttemptRow) {
  return {
    failedAttempts: row.failed_attempts,
    lockedUntil: row.locked_until,
    windowStartedAt: row.window_started_at,
  }
}

function mapSession(row: SessionRow) {
  return {
    expiresAt: row.expires_at,
    id: row.id,
    revokedAt: row.revoked_at,
    userId: row.user_id,
  }
}

function mapUser(row: UserRow) {
  return {
    email: row.email,
    id: row.id,
    passwordHash: row.password_hash,
  }
}
