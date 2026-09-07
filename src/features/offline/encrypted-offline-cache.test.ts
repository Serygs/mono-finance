import { describe, expect, it } from 'vitest'

import { decryptValue, encryptValue } from './encrypted-offline-cache'

describe('encrypted offline cache crypto', () => {
  it('round-trips financial payloads without retaining plaintext in ciphertext', async () => {
    const key = await crypto.subtle.generateKey(
      { length: 256, name: 'AES-GCM' },
      false,
      ['decrypt', 'encrypt'],
    )
    const value = { amountMinor: -4_000, description: 'Restaurant' }

    const encrypted = await encryptValue(value, key)

    expect(new TextDecoder().decode(encrypted.ciphertext)).not.toContain(
      'Restaurant',
    )
    await expect(decryptValue<typeof value>(encrypted, key)).resolves.toEqual(
      value,
    )
  })
})
