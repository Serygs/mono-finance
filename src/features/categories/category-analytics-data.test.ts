import { describe, expect, it } from 'vitest'
import { displayExpenseCategories } from './category-analytics-data'

describe('category analytics presentation', () => {
  it('shows the five largest expense categories and groups the remainder', () => {
    const categories = [300, 900, 800, 700, 600, 500, 400].map(
      (amountMinor, index) => ({
        amountMinor,
        categoryId: `category-${index + 1}`,
        categoryName: `Category ${index + 1}`,
        currencyCode: 'UAH',
      }),
    )

    const rankedCategories = [
      categories[1],
      categories[2],
      categories[3],
      categories[4],
      categories[5],
      categories[6],
      categories[0],
    ]

    expect(displayExpenseCategories(categories, 'Other')).toEqual({
      all: rankedCategories,
      initial: [
        ...rankedCategories.slice(0, 5),
        {
          amountMinor: 700,
          categoryId: null,
          categoryName: 'Other',
          currencyCode: 'UAH',
        },
      ],
    })
  })
})
