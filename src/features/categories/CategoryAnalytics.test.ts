import { describe, expect, it } from 'vitest'

import { getVisibleCategoryLegend } from './category-analytics-data'

describe('getVisibleCategoryLegend', () => {
  const values = Array.from({ length: 7 }, (_, index) => ({
    key: `category-${index + 1}`,
  }))

  it('shows the five largest categories by default', () => {
    expect(getVisibleCategoryLegend(values, null)).toEqual(values.slice(0, 5))
  })

  it('keeps a selected top category in its existing position', () => {
    expect(getVisibleCategoryLegend(values, 'category-3')).toEqual(
      values.slice(0, 5),
    )
  })

  it('appends a selected category outside the top five once', () => {
    expect(getVisibleCategoryLegend(values, 'category-7')).toEqual([
      ...values.slice(0, 5),
      values[6],
    ])
  })
})
