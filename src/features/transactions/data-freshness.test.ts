import { describe, expect, it } from 'vitest'
import { periodCoverage } from './data-freshness'

const window = (fromEpochSeconds: number, toEpochSeconds: number) => ({
  fromEpochSeconds,
  toEpochSeconds,
  completedAt: toEpochSeconds,
})

describe('elapsed period coverage', () => {
  it('ignores the future portion without changing the selected period', () => {
    const range = { dateFrom: 100, dateTo: 399 }
    expect(periodCoverage([window(100, 250)], range, 250)).toBe('covered')
    expect(range).toEqual({ dateFrom: 100, dateTo: 399 })
    expect(periodCoverage([window(100, 250)], range, 251)).toBe('partial')
  })

  it('retains historical gaps even when later coverage extends into the future', () => {
    const range = { dateFrom: 100, dateTo: 399 }
    expect(
      periodCoverage([window(100, 199), window(201, 399)], range, 250),
    ).toBe('partial')
    expect(periodCoverage([window(100, 299)], range, 500)).toBe('partial')
  })

  it('distinguishes future selections from unknown elapsed history', () => {
    expect(periodCoverage(undefined, { dateFrom: 251, dateTo: 399 }, 250)).toBe(
      'future',
    )
    expect(
      periodCoverage([window(251, 399)], { dateFrom: 100, dateTo: 399 }, 250),
    ).toBe('unknown')
    expect(periodCoverage(undefined, { dateFrom: 100, dateTo: 399 }, 250)).toBe(
      'unknown',
    )
    expect(periodCoverage([], { dateFrom: 250, dateTo: 399 }, 250)).toBe(
      'unknown',
    )
  })

  it('uses the selected end for completed historical periods', () => {
    expect(
      periodCoverage([window(100, 199)], { dateFrom: 100, dateTo: 199 }, 250),
    ).toBe('covered')
    expect(
      periodCoverage([window(100, 198)], { dateFrom: 100, dateTo: 199 }, 250),
    ).toBe('partial')
    expect(
      periodCoverage([window(250, 250)], { dateFrom: 250, dateTo: 399 }, 250),
    ).toBe('covered')
  })
})
