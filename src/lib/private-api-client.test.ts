import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  activatePrivateSession,
  endPrivateSession,
  subscribeSessionEnd,
} from '../features/auth/private-session'
import { fetchPrivateResponse } from './private-api-client'

beforeEach(() => activatePrivateSession(4_102_444_800))
afterEach(() => {
  endPrivateSession('logout')
  vi.unstubAllGlobals()
})

describe('private session request isolation', () => {
  it('rejects an in-flight network response after logout even if fetch ignores abort', async () => {
    const request = deferred<Response>()
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(request.promise))
    const result = fetchPrivateResponse('/api/accounts')
    const rejected = expect(result).rejects.toThrow(
      'The private session has ended.',
    )
    endPrivateSession('logout')
    activatePrivateSession(4_102_444_800)
    request.resolve(Response.json({ data: { accounts: [] } }))
    await rejected
  })
  it('rejects a body that finishes parsing after logout', async () => {
    const body = deferred<unknown>()
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, status: 200, json: () => body.promise }),
    )
    const response = await fetchPrivateResponse('/api/accounts')
    const rejected = expect(response.json()).rejects.toThrow(
      'The private session has ended.',
    )
    endPrivateSession('logout')
    body.resolve({ data: { accounts: [] } })
    await rejected
  })
  it('ends the session on 401 without returning an API payload', async () => {
    const ended = vi.fn()
    const unsubscribe = subscribeSessionEnd(ended)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    )
    await expect(fetchPrivateResponse('/api/accounts')).rejects.toThrow(
      'The private session has ended.',
    )
    expect(ended).toHaveBeenCalledWith('unauthorized')
    unsubscribe()
  })
  it('does not end the session on network, 429 or 5xx failures', async () => {
    const ended = vi.fn()
    const unsubscribe = subscribeSessionEnd(ended)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new TypeError('Offline'))
        .mockResolvedValueOnce(new Response(null, { status: 429 }))
        .mockResolvedValueOnce(new Response(null, { status: 503 })),
    )
    await expect(fetchPrivateResponse('/api/accounts')).rejects.toThrow(
      'Offline',
    )
    expect((await fetchPrivateResponse('/api/accounts')).ok).toBe(false)
    expect((await fetchPrivateResponse('/api/accounts')).ok).toBe(false)
    expect(ended).not.toHaveBeenCalled()
    unsubscribe()
  })
  it('blocks private requests before server verification', async () => {
    endPrivateSession('logout')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await expect(fetchPrivateResponse('/api/accounts')).rejects.toThrow(
      'The private session has ended.',
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}
