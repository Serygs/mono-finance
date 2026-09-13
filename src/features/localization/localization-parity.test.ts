import { describe, expect, it } from 'vitest'

import { ENGLISH_MESSAGE_KEYS, UKRAINIAN_MESSAGES } from './messages'

function compareTranslationKeys(
  englishKeys: readonly string[],
  ukrainianKeys: readonly string[],
) {
  const english = new Set(englishKeys)
  const ukrainian = new Set(ukrainianKeys)
  return {
    missingFromEnglish: [...ukrainian]
      .filter((key) => !english.has(key))
      .sort(),
    missingFromUkrainian: [...english]
      .filter((key) => !ukrainian.has(key))
      .sort(),
  }
}

describe('localization parity', () => {
  it('keeps every English and Ukrainian translation key aligned', () => {
    expect(
      compareTranslationKeys(
        ENGLISH_MESSAGE_KEYS,
        Object.keys(UKRAINIAN_MESSAGES),
      ),
    ).toEqual({ missingFromEnglish: [], missingFromUkrainian: [] })
  })
})
