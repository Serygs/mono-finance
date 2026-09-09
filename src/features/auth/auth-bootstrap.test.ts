import { describe, expect, it } from 'vitest'

import { resolveInitialSession, sessionExpiryDelay } from './auth-bootstrap'

describe('resolveInitialSession', () => {
  it('does not authenticate from an offline cached identity when the server session cannot be verified', async () => {
    await expect(
      resolveInitialSession(() => Promise.reject(new TypeError('Offline'))),
    ).resolves.toBeNull()
  })

  it('caps a future session timeout to a browser-supported delay', () => {
    expect(sessionExpiryDelay(2_000_000_000, 0)).toBe(2_147_483_647)
  })
})
