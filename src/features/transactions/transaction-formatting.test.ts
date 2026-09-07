import { describe, expect, it } from 'vitest'

import { parseAmountInputToMinor } from './transaction-formatting'

describe('parseAmountInputToMinor', () => {
  it('converts a decimal expense input to integer minor units without floating-point arithmetic', () => {
    expect(parseAmountInputToMinor('-1000.00', 2)).toBe(-100_000)
  })

  it('rejects an amount with more fractional digits than the currency supports', () => {
    expect(parseAmountInputToMinor('-10.123', 2)).toBeNull()
  })
})
