import { describe, expect, it } from 'vitest'

import {
  groupTransactionsByDate,
  parseAmountInputToMinor,
} from './transaction-formatting'

describe('parseAmountInputToMinor', () => {
  it('converts a decimal expense input to integer minor units without floating-point arithmetic', () => {
    expect(parseAmountInputToMinor('-1000.00', 2)).toBe(-100_000)
  })

  it('rejects an amount with more fractional digits than the currency supports', () => {
    expect(parseAmountInputToMinor('-10.123', 2)).toBeNull()
  })
})

describe('groupTransactionsByDate', () => {
  it('keeps transaction order while separating consecutive local calendar days', () => {
    const morning = new Date(2026, 0, 3, 9).getTime() / 1_000
    const afternoon = new Date(2026, 0, 3, 15).getTime() / 1_000
    const followingDay = new Date(2026, 0, 4, 9).getTime() / 1_000

    expect(
      groupTransactionsByDate([
        { id: 'first', originalTimestamp: morning },
        { id: 'second', originalTimestamp: afternoon },
        { id: 'third', originalTimestamp: followingDay },
      ]),
    ).toEqual([
      {
        dateKey: '2026-01-03',
        transactions: [
          { id: 'first', originalTimestamp: morning },
          { id: 'second', originalTimestamp: afternoon },
        ],
      },
      {
        dateKey: '2026-01-04',
        transactions: [{ id: 'third', originalTimestamp: followingDay }],
      },
    ])
  })
})
