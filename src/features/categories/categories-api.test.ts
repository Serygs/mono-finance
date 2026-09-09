import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getCategorySources,
  mergeCategories,
  resetCategorySourceMapping,
  saveCategorySourceMapping,
} from './categories-api'

describe('category API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads immutable source categories and their effective mappings', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        data: {
          sourceCategories: [
            {
              code: '5411',
              mappedCategory: null,
              originalName: 'MCC 5411',
              transactionCount: 12,
            },
          ],
        },
      }),
    )
    vi.stubGlobal('fetch', fetcher)

    await expect(getCategorySources()).resolves.toHaveLength(1)
    expect(fetcher).toHaveBeenCalledWith(
      '/api/category-sources',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('maps a source category and merges a custom category through private same-origin endpoints', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          data: {
            sourceCategory: {
              code: '5411',
              mappedCategory: { id: 'groceries', name: 'Groceries' },
              originalName: 'MCC 5411',
              transactionCount: 12,
            },
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            category: { id: 'groceries', name: 'Groceries' },
          },
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            sourceCategory: {
              code: '5411',
              mappedCategory: null,
              originalName: 'MCC 5411',
              transactionCount: 12,
            },
          },
        }),
      )
    vi.stubGlobal('fetch', fetcher)

    await saveCategorySourceMapping('5411', 'groceries')
    await mergeCategories('food', 'groceries')
    await resetCategorySourceMapping('5411')

    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      '/api/category-sources/5411',
      expect.objectContaining({
        body: JSON.stringify({ categoryId: 'groceries' }),
        method: 'PUT',
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      '/api/categories/food/merge',
      expect.objectContaining({
        body: JSON.stringify({ targetCategoryId: 'groceries' }),
        method: 'POST',
      }),
    )
    expect(fetcher).toHaveBeenNthCalledWith(
      3,
      '/api/category-sources/5411',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
