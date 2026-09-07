import { describe, expect, it } from 'vitest'

import { MonobankApiError } from './errors'
import {
  PersistentMonobankRequestGate,
  type MonobankRateLimitReservation,
  type MonobankRateLimitStore,
} from './rate-limit'

class FakeRateLimitStore implements MonobankRateLimitStore {
  reservation: MonobankRateLimitReservation = {
    acquired: true,
    nextAllowedAtEpochSeconds: 1_060,
  }
  deferredScope: string | undefined
  deferredUntil: number | undefined

  reserve(): Promise<MonobankRateLimitReservation> {
    return Promise.resolve(this.reservation)
  }

  defer(scope: string, nextAllowedAtEpochSeconds: number): Promise<void> {
    this.deferredScope = scope
    this.deferredUntil = nextAllowedAtEpochSeconds
    return Promise.resolve()
  }
}

describe('PersistentMonobankRequestGate', () => {
  it('allows a request after its D1-backed reservation succeeds', async () => {
    const store = new FakeRateLimitStore()
    const gate = new PersistentMonobankRequestGate(store, () => 1_000)

    await expect(gate.acquire('statement', 60)).resolves.toBeUndefined()
  })

  it('returns a retryable rate-limit error without calling Monobank when the window is occupied', async () => {
    const store = new FakeRateLimitStore()
    store.reservation = {
      acquired: false,
      nextAllowedAtEpochSeconds: 1_045,
    }
    const gate = new PersistentMonobankRequestGate(store, () => 1_000)

    const result = gate.acquire('statement', 60)

    await expect(result).rejects.toMatchObject<Partial<MonobankApiError>>({
      code: 'rate_limit',
      retryable: true,
      retryAfterSeconds: 45,
    })
  })

  it('extends the persisted window after a remote rate-limit response', async () => {
    const store = new FakeRateLimitStore()
    const gate = new PersistentMonobankRequestGate(store, () => 1_000)

    await gate.defer('client-info', 75)

    expect(store.deferredScope).toBe('client-info')
    expect(store.deferredUntil).toBe(1_075)
  })
})
