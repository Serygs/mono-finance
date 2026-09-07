import { describe, expect, it } from 'vitest'

import { formatAccountBalance } from './account-formatting'

describe('account balance formatting', () => {
  it('formats two-decimal currencies from integer minor units', () => {
    expect(formatAccountBalance(125_050, 2, 'UAH')).toBe('1,250.50 UAH')
  })

  it('formats currencies without minor units', () => {
    expect(formatAccountBalance(1_200, 0, 'JPY')).toBe('1,200 JPY')
  })

  it('keeps unknown numeric currencies in explicit minor units', () => {
    expect(formatAccountBalance(125_050, 0, '999')).toBe(
      '125,050 minor units · ISO 999',
    )
  })
})
