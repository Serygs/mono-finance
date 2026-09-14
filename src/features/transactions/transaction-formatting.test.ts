import { describe, expect, it } from 'vitest'

import {
  formatTransactionDateGroup,
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
  it('groups an unordered filtered dataset by local calendar date and sorts newest first', () => {
    const morning = new Date(2026, 0, 3, 9).getTime() / 1_000
    const afternoon = new Date(2026, 0, 3, 15).getTime() / 1_000
    const followingDay = new Date(2026, 0, 4, 9).getTime() / 1_000

    expect(
      groupTransactionsByDate([
        { id: 'first', originalTimestamp: morning },
        { id: 'third', originalTimestamp: followingDay },
        { id: 'second', originalTimestamp: afternoon },
      ]),
    ).toEqual([
      {
        dateKey: '2026-01-04',
        transactions: [{ id: 'third', originalTimestamp: followingDay }],
      },
      {
        dateKey: '2026-01-03',
        transactions: [
          { id: 'second', originalTimestamp: afternoon },
          { id: 'first', originalTimestamp: morning },
        ],
      },
    ])
  })

  it('keeps transactions either side of local midnight in separate groups', () => {
    const late = new Date(2026, 8, 6, 23, 59).getTime() / 1_000
    const early = new Date(2026, 8, 7, 0, 1).getTime() / 1_000

    expect(
      groupTransactionsByDate([
        { originalTimestamp: late },
        { originalTimestamp: early },
      ]),
    ).toMatchObject([{ dateKey: '2026-09-07' }, { dateKey: '2026-09-06' }])
  })
})

describe('formatTransactionDateGroup', () => {
  const now = new Date(2026, 8, 7, 12)
  const labels = { locale: 'en', now, today: 'Today', yesterday: 'Yesterday' }

  it('uses calendar-relative labels for today and yesterday', () => {
    expect(formatTransactionDateGroup('2026-09-07', labels)).toBe('Today')
    expect(formatTransactionDateGroup('2026-09-06', labels)).toBe('Yesterday')
  })

  it('formats older dates without a year until the calendar year changes', () => {
    expect(formatTransactionDateGroup('2026-08-31', labels)).toBe('August 31')
    expect(formatTransactionDateGroup('2025-12-31', labels)).toBe(
      'December 31, 2025',
    )
  })

  it('uses the requested locale for older date labels', () => {
    expect(
      formatTransactionDateGroup('2026-09-05', {
        ...labels,
        locale: 'uk',
      }),
    ).toBe('5 вересня')
  })
})
