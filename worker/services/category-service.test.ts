import { describe, expect, it } from 'vitest'

import { CategoryService, type CategoryRepository } from './category-service'

describe('CategoryService', () => {
  it('creates a custom category for the owner', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository, () => 1_700_000_000)

    await expect(
      service.create('owner-1', {
        colorToken: 'mint',
        icon: 'leaf',
        name: 'Shared meals',
      }),
    ).resolves.toMatchObject({ name: 'Shared meals', icon: 'leaf' })
  })

  it('uses an owned override for analytics while retaining the imported category', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository)

    await expect(
      service.setTransactionOverride('owner-1', 'transaction-1', 'category-1'),
    ).resolves.toEqual({
      category: { id: 'category-1', name: 'Shared meals', source: 'custom' },
      originalCategory: { id: '5812', name: 'Restaurants' },
    })
    expect(repository.transaction.originalCategoryName).toBe('Restaurants')
  })

  it('resets an override back to the immutable imported category', async () => {
    const repository = new FakeCategoryRepository()
    repository.overrideCategoryId = 'category-1'
    const service = new CategoryService(repository)

    await expect(
      service.resetTransactionOverride('owner-1', 'transaction-1'),
    ).resolves.toEqual({
      category: { id: '5812', name: 'Restaurants', source: 'original' },
      originalCategory: { id: '5812', name: 'Restaurants' },
    })
  })

  it('maps an immutable source category for every matching transaction', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository, () => 1_700_000_000)

    await expect(
      service.setSourceMapping('owner-1', '5812', 'category-1'),
    ).resolves.toMatchObject({
      code: '5812',
      mappedCategory: { id: 'category-1', name: 'Shared meals' },
    })
    expect(repository.sourceCategoryName).toBe('Restaurants')
  })

  it('merges category references into another owned category', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository, () => 1_700_000_000)

    await expect(
      service.merge('owner-1', 'category-1', 'category-2'),
    ).resolves.toMatchObject({ id: 'category-2' })
    expect(repository.merged).toEqual({
      now: 1_700_000_000,
      sourceCategoryId: 'category-1',
      targetCategoryId: 'category-2',
      userId: 'owner-1',
    })
  })
})

class FakeCategoryRepository implements CategoryRepository {
  merged: Record<string, unknown> | null = null
  overrideCategoryId: string | null = null
  sourceCategoryName = 'Restaurants'
  readonly category = {
    colorToken: 'mint',
    icon: 'leaf',
    id: 'category-1',
    name: 'Shared meals',
  }
  readonly transaction = {
    id: 'transaction-1',
    mappedCategory: null as typeof this.category | null,
    originalCategoryCode: '5812',
    originalCategoryName: 'Restaurants',
    overrideCategory: null as typeof this.category | null,
  }

  async countOverrides() {
    return this.overrideCategoryId === null ? 0 : 1
  }
  async countSourceMappings() {
    return 0
  }
  async createCategory(input: {
    colorToken: string | null
    icon: string | null
    name: string
  }) {
    return { ...this.category, ...input }
  }
  async deleteCategory() {}
  async findCategory(categoryId: string) {
    return { ...this.category, id: categoryId }
  }
  async findOwnedTransaction() {
    return {
      ...this.transaction,
      overrideCategory: this.overrideCategoryId === null ? null : this.category,
    }
  }
  async findSourceCategory(sourceCode: string) {
    return {
      code: sourceCode,
      mappedCategory: null,
      originalName: this.sourceCategoryName,
      transactionCount: 2,
    }
  }
  async listCategories() {
    return [this.category]
  }
  async listSourceCategories() {
    return []
  }
  async mergeCategories(
    sourceCategoryId: string,
    targetCategoryId: string,
    userId: string,
    now: number,
  ) {
    this.merged = { now, sourceCategoryId, targetCategoryId, userId }
  }
  async removeSourceMapping() {}
  async removeTransactionOverride() {
    this.overrideCategoryId = null
  }
  async setTransactionOverride(_transactionId: string, categoryId: string) {
    this.overrideCategoryId = categoryId
  }
  async setSourceMapping() {}
  async updateCategory(
    _categoryId: string,
    _userId: string,
    input: { colorToken: string | null; icon: string | null; name: string },
  ) {
    return { ...this.category, ...input }
  }
}
