import { describe, expect, it } from 'vitest'

import { interpolate, isLocale, resolveLocale } from './localization'

describe('localization', () => {
  it('prefers a persisted supported locale over browser languages', () => {
    expect(resolveLocale('uk', ['en-US'])).toBe('uk')
  })

  it('detects Ukrainian from the browser and otherwise falls back to English', () => {
    expect(resolveLocale(null, ['uk-UA', 'en-US'])).toBe('uk')
    expect(resolveLocale(null, ['de-DE'])).toBe('en')
  })

  it('accepts only the two supported UI locale codes', () => {
    expect(isLocale('en')).toBe(true)
    expect(isLocale('uk')).toBe(true)
    expect(isLocale('ua')).toBe(false)
    expect(isLocale('de')).toBe(false)
  })

  it('interpolates named values without changing unknown placeholders', () => {
    expect(
      interpolate('Showing {count} of {total}', { count: 3, total: 8 }),
    ).toBe('Showing 3 of 8')
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}')
  })
})
