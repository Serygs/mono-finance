import { afterEach, describe, expect, it, vi } from 'vitest'

import type { AuthService } from '../auth/auth-service'
import { createApp } from '../app'
import { MonobankApiError } from '../monobank/errors'
import type { AccountService } from '../services/account-service'

const account = {
  balanceMinor: 125_050,
  cards: [
    {
      id: 'card-1',
      isActive: true,
      maskedPan: '537541******1234',
    },
  ],
  creditLimitMinor: 50_000,
  currency: {
    code: 'UAH',
    displayName: 'Ukrainian Hryvnia',
    minorUnit: 2,
    numericCode: '980',
  },
  id: 'account-1',
  isActive: true,
  type: 'black',
}

describe('accounts routes', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('returns only the authenticated owner safe account view', async () => {
    const service = new FakeAccountService()
    const response = await authenticatedRequest(service, '/api/accounts')

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    const payload = await response.json()
    expect(payload).toEqual({
      data: { accounts: [account] },
    })
    expect(service.listedFor).toBe('owner-1')
    expect(JSON.stringify(payload)).not.toContain('monobank')
  })

  it('synchronizes accounts for the authenticated owner', async () => {
    const service = new FakeAccountService()
    const response = await authenticatedRequest(
      service,
      '/api/sync/accounts',
      'POST',
    )

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: { accounts: [account] },
    })
    expect(service.synchronizedFor).toBe('owner-1')
  })

  it('rejects account reads without a session before invoking the service', async () => {
    const service = new FakeAccountService()
    const app = createApp(
      () => authenticatedService,
      () => service as unknown as AccountService,
    )

    const response = await app.request('/api/accounts', {}, environment)

    expect(response.status).toBe(401)
    expect(service.listedFor).toBeNull()
  })

  it('maps provider rate limits to a safe retryable API error', async () => {
    const service = new FakeAccountService()
    service.synchronizeError = new MonobankApiError(
      'rate_limit',
      'provider diagnostic must not leak',
      { retryable: true, retryAfterSeconds: 42 },
    )

    const response = await authenticatedRequest(
      service,
      '/api/sync/accounts',
      'POST',
    )

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'sync_rate_limited',
        message: 'Account sync is temporarily rate limited.',
      },
    })
  })

  it('does not expose provider credential failures', async () => {
    const service = new FakeAccountService()
    service.synchronizeError = new MonobankApiError(
      'unauthorized_token',
      'provider credential diagnostic must not leak',
      { retryable: false },
    )

    const response = await authenticatedRequest(
      service,
      '/api/sync/accounts',
      'POST',
    )

    expect(response.status).toBe(502)
    const payload = await response.json()
    expect(payload).toEqual({
      error: {
        code: 'sync_unavailable',
        message: 'Accounts could not be synchronized. Try again later.',
      },
    })
    expect(JSON.stringify(payload)).not.toContain('credential')
  })

  it('logs only the safe provider failure category for diagnosis', async () => {
    const service = new FakeAccountService()
    service.synchronizeError = new MonobankApiError(
      'malformed_response',
      'provider payload must not leak',
      { retryable: false, status: 200 },
    )
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await authenticatedRequest(service, '/api/sync/accounts', 'POST')

    expect(errorLog).toHaveBeenCalledWith(
      JSON.stringify({
        errorCode: 'malformed_response',
        message: 'monobank_account_sync_failed',
        status: 200,
      }),
    )
    expect(errorLog.mock.calls.flat().join('')).not.toContain('payload')
  })

  it('logs a transport error code without its diagnostic message', async () => {
    const service = new FakeAccountService()
    service.synchronizeError = new MonobankApiError(
      'remote_api_error',
      'provider diagnostic must not leak',
      {
        cause: Object.assign(new Error('sensitive network diagnostic'), {
          code: 'UND_ERR_CONNECT_TIMEOUT',
        }),
        retryable: true,
      },
    )
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    await authenticatedRequest(service, '/api/sync/accounts', 'POST')

    expect(JSON.parse(errorLog.mock.calls[0]![0] as string)).toEqual({
      causeCode: 'UND_ERR_CONNECT_TIMEOUT',
      causeName: 'Error',
      errorCode: 'remote_api_error',
      message: 'monobank_account_sync_failed',
    })
    expect(errorLog.mock.calls.flat().join('')).not.toContain('sensitive')
  })

  it('rejects cross-origin synchronization before invoking the service', async () => {
    const service = new FakeAccountService()
    const app = createApp(
      () => authenticatedService,
      () => service as unknown as AccountService,
    )

    const response = await app.request(
      '/api/sync/accounts',
      {
        headers: {
          Cookie: 'mono_finance_session=test-session',
          Origin: 'https://attacker.example',
        },
        method: 'POST',
      },
      environment,
    )

    expect(response.status).toBe(400)
    expect(service.synchronizedFor).toBeNull()
  })
})

const authenticatedService = {
  async requireSession() {
    return { email: 'owner@example.com', id: 'owner-1' }
  },
} as unknown as AuthService

const environment = {
  APP_ENV: 'development' as const,
  DB: {} as D1Database,
  MONOBANK_TOKEN: 'test-token',
  SESSION_TOKEN_PEPPER: 'test-pepper',
  SETUP_TOKEN: 'test-setup-token',
}

async function authenticatedRequest(
  service: FakeAccountService,
  path: string,
  method = 'GET',
) {
  const app = createApp(
    () => authenticatedService,
    () => service as unknown as AccountService,
  )
  return app.request(
    path,
    {
      headers: {
        Cookie: 'mono_finance_session=test-session',
        Origin: 'http://localhost',
      },
      method,
    },
    environment,
  )
}

class FakeAccountService {
  listedFor: string | null = null
  synchronizedFor: string | null = null
  synchronizeError: unknown = null

  async list(userId: string) {
    this.listedFor = userId
    return [account]
  }

  async synchronize(userId: string) {
    this.synchronizedFor = userId
    if (this.synchronizeError !== null) {
      throw this.synchronizeError
    }
    return [account]
  }
}
