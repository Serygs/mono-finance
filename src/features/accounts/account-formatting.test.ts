import { describe, expect, it } from 'vitest'

import {
  accountVisualIdentity,
  currencyDisplayName,
  formatAccountBalance,
} from './account-formatting'

describe('account balance formatting', () => {
  it('formats two-decimal currencies from integer minor units', () => {
    expect(formatAccountBalance(125_050, 2, 'UAH')).toBe('UAH\u00a01,250.50')
  })

  it('formats currencies without minor units', () => {
    expect(formatAccountBalance(1_200, 0, 'JPY')).toBe('JPY\u00a01,200')
  })

  it('formats an exact aggregated bigint balance', () => {
    expect(formatAccountBalance(2_000n, 2, 'UAH')).toBe('UAH\u00a020.00')
  })

  it('keeps unknown numeric currencies in explicit minor units', () => {
    expect(formatAccountBalance(125_050, 0, '999')).toBe(
      '125,050 minor units · ISO 999',
    )
  })

  it('uses Ukrainian grouping and decimals without losing large bigint digits', () => {
    expect(formatAccountBalance(-18_014_398_509_481_982n, 2, 'UAH', 'uk')).toBe(
      '-180\u00a0143\u00a0985\u00a0094\u00a0819,82\u00a0UAH',
    )
    expect(formatAccountBalance(0, 3, 'BHD', 'en')).toBe('BHD\u00a00.000')
    expect(formatAccountBalance(-12, 0, '999', 'uk', 'копійки')).toBe(
      '−12 копійки · ISO 999',
    )
  })

  it('localizes known currency names and retains supplied unknown names', () => {
    expect(currencyDisplayName('UAH', 'Ukrainian hryvnia', 'uk')).toBe(
      'українська гривня',
    )
    expect(currencyDisplayName('USD', 'Долар', 'en')).toBe('US Dollar')
    expect(currencyDisplayName('ZZZ', 'Private currency', 'en')).toBe(
      'Private currency',
    )
    expect(currencyDisplayName('999', 'Unknown currency', 'uk')).toBe('999')
  })

  it('keeps real Black/White type identities and stable fallback visuals', () => {
    expect(accountVisualIdentity('first', 'black')).toBe('black')
    expect(accountVisualIdentity('first', 'white')).toBe('white')
    const ids = ['alpha', 'beta', 'gamma']
    const original = new Map(
      ids.map((id) => [id, accountVisualIdentity(id, 'other')]),
    )
    for (const id of ids.reverse())
      expect(accountVisualIdentity(id, 'other')).toBe(original.get(id))
  })
})
