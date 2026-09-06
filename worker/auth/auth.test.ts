import { describe, expect, it } from 'vitest'

import { createApp } from '../app'
import {
  type AuthRepository,
  AuthService,
  type Clock,
  type PasswordHasher,
  type SessionTokenService,
} from './auth-service'

const NOW = 1_800_000_000

describe('authentication API', () => {
  it('allows controlled initial owner setup exactly once', async () => {
    const fixture = createFixture()

    const response = await fixture.app.request(
      '/api/auth/setup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Setup-Token': 'test-setup-token',
        },
        body: JSON.stringify({
          email: fixture.user.email,
          password: 'correct-password',
        }),
      },
      fixture.environment,
    )

    expect(response.status).toBe(201)
    expect(fixture.repository.user?.passwordHash).toBe('hash:correct-password')

    const repeatSetup = await fixture.app.request(
      '/api/auth/setup',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Setup-Token': 'test-setup-token',
        },
        body: JSON.stringify({
          email: fixture.user.email,
          password: 'correct-password',
        }),
      },
      fixture.environment,
    )
    expect(repeatSetup.status).toBe(409)
  })

  it('creates a session for the application owner with the correct password', async () => {
    const fixture = createFixture()
    fixture.repository.user = fixture.user
    fixture.passwordHasher.matches = true

    const response = await fixture.app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fixture.user.email,
          password: 'correct-password',
        }),
      },
      fixture.environment,
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly')
    expect(response.headers.get('Set-Cookie')).toContain('SameSite=Strict')
    expect(response.headers.get('Set-Cookie')).toContain('Secure')
    await expect(response.json()).resolves.toEqual({
      data: { user: { email: fixture.user.email, id: fixture.user.id } },
    })

    const currentSession = await fixture.app.request(
      '/api/auth/session',
      {
        headers: { Cookie: response.headers.get('Set-Cookie')!.split(';')[0]! },
      },
      fixture.environment,
    )
    expect(currentSession.status).toBe(200)
    await expect(currentSession.json()).resolves.toEqual({
      data: { user: { email: fixture.user.email, id: fixture.user.id } },
    })
  })

  it('does not reveal whether the submitted password was incorrect', async () => {
    const fixture = createFixture()
    fixture.repository.user = fixture.user

    const response = await fixture.app.request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: fixture.user.email,
          password: 'wrong-password',
        }),
      },
      fixture.environment,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'invalid_credentials',
        message: 'Invalid email or password.',
      },
    })
  })

  it('rejects an authentication write from a different origin', async () => {
    const fixture = createFixture()

    const response = await fixture.app.request(
      'https://mono.example/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://untrusted.example',
        },
        body: JSON.stringify({
          email: fixture.user.email,
          password: 'wrong-password',
        }),
      },
      fixture.environment,
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: { code: 'invalid_request', message: 'Invalid request.' },
    })
  })

  it('rejects an expired session and every unrecognised private API path', async () => {
    const fixture = createFixture()
    fixture.repository.user = fixture.user
    fixture.repository.sessions.set('expired-token-hash', {
      expiresAt: NOW - 1,
      id: 'expired-session',
      revokedAt: null,
      userId: fixture.user.id,
    })

    const headers = { Cookie: 'mono_finance_session=expired-token' }
    const sessionResponse = await fixture.app.request(
      '/api/auth/session',
      { headers },
      fixture.environment,
    )
    const privateResponse = await fixture.app.request(
      '/api/private-data',
      { headers },
      fixture.environment,
    )

    expect(sessionResponse.status).toBe(401)
    expect(privateResponse.status).toBe(401)
  })

  it('rejects a missing session', async () => {
    const fixture = createFixture()

    const response = await fixture.app.request(
      '/api/auth/session',
      {},
      fixture.environment,
    )

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'unauthenticated',
        message: 'Authentication is required.',
      },
    })
  })

  it('revokes the session and clears its browser cookie on logout', async () => {
    const fixture = createFixture()
    fixture.repository.user = fixture.user
    fixture.repository.sessions.set('active-token-hash', {
      expiresAt: NOW + 60,
      id: 'active-session',
      revokedAt: null,
      userId: fixture.user.id,
    })

    const response = await fixture.app.request(
      'https://mono.example/api/auth/logout',
      {
        method: 'POST',
        headers: {
          Cookie: 'mono_finance_session=active-token',
          Origin: 'https://mono.example',
        },
      },
      fixture.environment,
    )

    expect(response.status).toBe(200)
    expect(
      fixture.repository.sessions.get('active-token-hash')?.revokedAt,
    ).toBe(NOW)
    expect(response.headers.get('Set-Cookie')).toContain('Max-Age=0')
  })

  it('locks an identifier after repeated failed logins', async () => {
    const fixture = createFixture()
    fixture.repository.user = fixture.user
    const request = () =>
      fixture.app.request(
        '/api/auth/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'CF-Connecting-IP': '203.0.113.8',
          },
          body: JSON.stringify({
            email: fixture.user.email,
            password: 'wrong-password',
          }),
        },
        fixture.environment,
      )

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect((await request()).status).toBe(401)
    }

    const limited = await request()

    expect(limited.status).toBe(429)
    expect(limited.headers.get('Retry-After')).toBe('900')
    await expect(limited.json()).resolves.toEqual({
      error: {
        code: 'too_many_requests',
        message: 'Too many login attempts. Try again later.',
      },
    })
  })
})

function createFixture() {
  const repository = new FakeAuthRepository()
  const passwordHasher = new FakePasswordHasher()
  const sessionTokens: SessionTokenService = {
    async hash(token) {
      return `${token}-hash`
    },
    generate() {
      return 'new-session-token'
    },
  }
  const clock: Clock = { now: () => NOW }
  const service = new AuthService(
    repository,
    passwordHasher,
    sessionTokens,
    clock,
  )
  const app = createApp(() => service)
  const user = {
    email: 'owner@example.com',
    id: 'owner-1',
    passwordHash: 'hash:correct-password',
  }
  const environment = {
    APP_ENV: 'production' as const,
    DB: {} as D1Database,
    SESSION_TOKEN_PEPPER: 'test-pepper',
    SETUP_TOKEN: 'test-setup-token',
  }

  return { app, environment, passwordHasher, repository, user }
}

class FakePasswordHasher implements PasswordHasher {
  matches = false

  async hash(password: string) {
    return `hash:${password}`
  }

  async verify(password: string, passwordHash: string) {
    return this.matches && passwordHash === `hash:${password}`
  }
}

class FakeAuthRepository implements AuthRepository {
  user: { email: string; id: string; passwordHash: string } | null = null
  readonly loginAttempts = new Map<
    string,
    {
      failedAttempts: number
      lockedUntil: number | null
      windowStartedAt: number
    }
  >()
  readonly sessions = new Map<
    string,
    { expiresAt: number; id: string; revokedAt: number | null; userId: string }
  >()

  async countUsers() {
    return this.user === null ? 0 : 1
  }

  async createOwner(user: { email: string; id: string; passwordHash: string }) {
    if (this.user !== null) {
      return false
    }
    this.user = user
    return true
  }

  async findUserByEmail(email: string) {
    return this.user?.email === email ? this.user : null
  }

  async findUserById(id: string) {
    return this.user?.id === id
      ? { email: this.user.email, id: this.user.id }
      : null
  }

  async findSessionByTokenHash(tokenHash: string) {
    return this.sessions.get(tokenHash) ?? null
  }

  async createSession(session: {
    expiresAt: number
    id: string
    tokenHash: string
    userId: string
  }) {
    this.sessions.set(session.tokenHash, { ...session, revokedAt: null })
  }

  async revokeSession(tokenHash: string, revokedAt: number) {
    const session = this.sessions.get(tokenHash)
    if (session !== undefined) {
      session.revokedAt = revokedAt
    }
  }

  async clearLoginAttempts(identifierHash: string) {
    this.loginAttempts.delete(identifierHash)
  }

  async findLoginAttempt(identifierHash: string) {
    return this.loginAttempts.get(identifierHash) ?? null
  }

  async recordFailedLogin(
    identifierHash: string,
    now: number,
    windowSeconds: number,
    maxAttempts: number,
    lockSeconds: number,
  ) {
    const existing = this.loginAttempts.get(identifierHash)
    const failedAttempts =
      existing === undefined || existing.windowStartedAt <= now - windowSeconds
        ? 1
        : existing.failedAttempts + 1
    this.loginAttempts.set(identifierHash, {
      failedAttempts,
      lockedUntil: failedAttempts >= maxAttempts ? now + lockSeconds : null,
      windowStartedAt:
        failedAttempts === 1 || existing === undefined
          ? now
          : existing.windowStartedAt,
    })
  }
}
