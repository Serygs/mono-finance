import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  authenticationErrorKey,
  getCurrentSession,
  login,
  logout,
} from './auth-api'

afterEach(() => vi.unstubAllGlobals())

describe('authentication responses', () => {
  it.each([
    [401, 'invalid-credentials'],
    [429, 'rate-limited'],
    [500, 'server'],
    [503, 'server'],
  ])(
    'classifies login HTTP %i without exposing the response body',
    async (status, kind) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('sensitive server details', {
            status: Number(status),
          }),
        ),
      )
      await expect(
        login('owner@example.com', 'synthetic-password'),
      ).rejects.toMatchObject({
        kind,
        message: 'Authentication request failed.',
      })
    },
  )
  it('classifies offline login and session verification as temporary network failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    await expect(
      login('owner@example.com', 'synthetic-password'),
    ).rejects.toMatchObject({ kind: 'network' })
    await expect(getCurrentSession()).rejects.toMatchObject({ kind: 'network' })
  })
  it('returns null only for confirmed session HTTP 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )
    await expect(getCurrentSession()).resolves.toBeNull()
    await expect(logout()).resolves.toBeUndefined()
  })
  it.each([429, 500, 503])(
    'preserves verification failure HTTP %i for recovery',
    async (status) => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(new Response(null, { status })),
      )
      await expect(getCurrentSession()).rejects.toMatchObject({
        kind: status === 429 ? 'rate-limited' : 'server',
      })
    },
  )
  it('accepts only an unexpired session with a valid identity', async () => {
    const session = {
      expiresAt: Math.floor(Date.now() / 1_000) + 60,
      user: { id: 'owner', email: 'owner@example.com' },
    }
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: session })),
    )
    await expect(getCurrentSession()).resolves.toEqual(session)
  })
  it.each([
    { expiresAt: 1, user: { id: 'owner', email: 'owner@example.com' } },
    { expiresAt: 4_102_444_800, user: {} },
  ])('rejects expired or malformed session data', async (session) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ data: session })),
    )
    await expect(getCurrentSession()).rejects.toMatchObject({ kind: 'server' })
  })
  it('uses a safe localized message for unknown errors', () => {
    expect(authenticationErrorKey(new Error('private details'))).toBe(
      'Authentication is temporarily unavailable. Try again later.',
    )
  })
})
