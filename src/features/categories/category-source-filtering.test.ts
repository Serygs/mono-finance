import { describe, expect, it } from 'vitest'

import type { SourceCategory } from './categories-api'
import { filterCategorySources } from './category-source-filtering'

const sources: SourceCategory[] = [
  {
    code: '5411',
    mappedCategory: null,
    originalName: 'Groceries',
    transactionCount: 4,
  },
  {
    code: '5812',
    mappedCategory: {
      colorToken: 'mint',
      icon: 'dining',
      id: 'dining',
      name: 'Dining',
    },
    originalName: 'Restaurants',
    transactionCount: 2,
  },
]

describe('filterCategorySources', () => {
  it('filters source categories by MCC, imported name, and mapping state', () => {
    expect(filterCategorySources(sources, '5411', 'all')).toEqual([sources[0]])
    expect(filterCategorySources(sources, 'restaurant', 'mapped')).toEqual([
      sources[1],
    ])
    expect(filterCategorySources(sources, '', 'unmapped')).toEqual([sources[0]])
  })
})
