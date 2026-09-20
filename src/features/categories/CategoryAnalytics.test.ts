import { describe, expect, it } from 'vitest'

import {
  aggregateCategoryDistribution,
  categoryPercentage,
  getActiveExpenseCategoryCount,
} from './category-analytics-data'

describe('aggregateCategoryDistribution', () => {
  const values = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      amountMinor: count - index,
      key: `category-${index + 1}`,
    }))
  const other = (amountMinor: number) => ({ amountMinor, key: 'other' })

  it.each([0, 1, 10])(
    'returns the %i categories unchanged when no aggregation is needed',
    (count) => {
      expect(aggregateCategoryDistribution(values(count), other)).toEqual(
        values(count),
      )
    },
  )

  it('keeps the ten largest categories and aggregates the eleventh into Other', () => {
    const distribution = aggregateCategoryDistribution(values(11), other)

    expect(distribution).toHaveLength(11)
    expect(distribution.slice(0, 10)).toEqual(values(11).slice(0, 10))
    expect(distribution[10]).toEqual({ amountMinor: 1, key: 'other' })
    expect(categoryPercentage(distribution[10]!.amountMinor, 66)).toBe(2)
  })

  it('sorts unsorted input and gives Other the exact total outside the top ten', () => {
    const distribution = aggregateCategoryDistribution(
      [
        { amountMinor: 5, key: 'small-a' },
        ...values(12),
        { amountMinor: 4, key: 'small-b' },
      ],
      other,
    )

    expect(distribution).toHaveLength(11)
    expect(distribution.slice(0, 10).map((item) => item.amountMinor)).toEqual([
      12, 11, 10, 9, 8, 7, 6, 5, 5, 4,
    ])
    expect(distribution[10]).toEqual({ amountMinor: 10, key: 'other' })
    expect(categoryPercentage(distribution[10]!.amountMinor, 87)).toBe(11)
  })
})

describe('getActiveExpenseCategoryCount', () => {
  it('counts distinct non-zero categories from the expense breakdown', () => {
    expect(
      getActiveExpenseCategoryCount([
        { amountMinor: 2_000, categoryId: 'food', categoryName: 'Food' },
        { amountMinor: 0, categoryId: 'travel', categoryName: 'Travel' },
        { amountMinor: 500, categoryId: 'food', categoryName: 'Food' },
        { amountMinor: 300, categoryId: null, categoryName: 'Other' },
      ]),
    ).toBe(2)
  })
})
