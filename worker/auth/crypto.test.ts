import { describe, expect, it } from 'vitest'

import { HmacSessionTokenService, WebCryptoPasswordHasher } from './crypto'

describe('WebCryptoPasswordHasher', () => {
  it('verifies the original password but rejects a different password', async () => {
    const hasher = new WebCryptoPasswordHasher()
    const passwordHash = await hasher.hash('correct-password')

    expect(passwordHash).toMatch(/^pbkdf2-sha256\$100000\$/u)
    await expect(hasher.verify('correct-password', passwordHash)).resolves.toBe(
      true,
    )
    await expect(
      hasher.verify('incorrect-password', passwordHash),
    ).resolves.toBe(false)
  })
})

describe('HmacSessionTokenService', () => {
  it('creates opaque random tokens and stable keyed hashes', async () => {
    const tokenService = new HmacSessionTokenService('test-only-pepper')
    const first = tokenService.generate()
    const second = tokenService.generate()

    expect(first).not.toBe(second)
    await expect(tokenService.hash(first)).resolves.toBe(
      await tokenService.hash(first),
    )
    await expect(tokenService.hash(first)).resolves.not.toBe(
      await tokenService.hash(second),
    )
  })
})
