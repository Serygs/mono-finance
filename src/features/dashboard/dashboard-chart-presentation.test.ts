import { describe, expect, it } from 'vitest'
import { minorRatioPercent } from './dashboard-chart-presentation'
import { groupTimeSeriesIntoBuckets } from './dashboard-data'

describe('exact chart presentation', () => {
  it('keeps signed magnitudes, tiny values and large bigint ratios exact', () => {
    expect(minorRatioPercent(-25, 100)).toBe('25.00')
    expect(minorRatioPercent(1, 1000)).toBe('0.10')
    expect(minorRatioPercent(0, 0)).toBe('0')
    expect(
      minorRatioPercent(9_007_199_254_740_993n, 18_014_398_509_481_986n),
    ).toBe('50.00')
  })

  it('orders short series chronologically without mutating API points', () => {
    const points = [2, 1].map((periodStart) => ({
      periodStart,
      currencyCode: 'UAH',
      expenseAmountMinor: -1,
      incomeAmountMinor: 2,
      netAmountMinor: 1,
    }))
    expect(
      groupTimeSeriesIntoBuckets(points).map((item) => item.periodStart),
    ).toEqual([1, 2])
    expect(points.map((item) => item.periodStart)).toEqual([2, 1])
  })
})
