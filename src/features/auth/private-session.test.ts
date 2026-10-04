import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  activatePrivateSession,
  endPrivateSession,
  privateSession,
  subscribeSessionEnd,
} from './private-session'

afterEach(() => {
  endPrivateSession('logout')
  vi.useRealTimers()
})

describe('private session deadline', () => {
  it('rejects cached and network access when expiry passes before a browser timer runs', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const ended = vi.fn()
    const unsubscribe = subscribeSessionEnd(ended)
    activatePrivateSession(1_001)
    expect(privateSession().signal.aborted).toBe(false)
    vi.setSystemTime(1_001_000)
    expect(() => privateSession()).toThrow('The private session has ended.')
    expect(ended).toHaveBeenCalledWith('expired')
    unsubscribe()
  })
})
