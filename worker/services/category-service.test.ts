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
    repository.sourceCategoryId = 'category-2'
    const service = new CategoryService(repository)

    await expect(
      service.setTransactionOverride('owner-1', 'transaction-1', 'category-1'),
    ).resolves.toEqual({
      category: { id: 'category-1', name: 'Shared meals', source: 'custom' },
      originalCategory: { id: '5812', name: 'Restaurants' },
    })
    expect(repository.transaction.originalCategoryName).toBe('Restaurants')
  })

  it('uses a source mapping for every transaction without a per-transaction override', async () => {
    const repository = new FakeCategoryRepository()
    repository.sourceCategoryId = 'category-1'
    const service = new CategoryService(repository)

    await expect(
      service.resetTransactionOverride('owner-1', 'transaction-1'),
    ).resolves.toEqual({
      category: { id: 'category-1', name: 'Shared meals', source: 'mapped' },
      originalCategory: { id: '5812', name: 'Restaurants' },
    })
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

  it('maps an immutable source category to an owned custom category', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository, () => 1_700_000_000)

    await expect(
      service.setSourceMapping('owner-1', '5411', 'category-1'),
    ).resolves.toMatchObject({
      code: '5411',
      mappedCategory: { id: 'category-1', name: 'Shared meals' },
    })
    expect(repository.sourceCategoryId).toBe('category-1')
  })

  it('resets a source mapping back to the immutable imported category', async () => {
    const repository = new FakeCategoryRepository()
    repository.sourceCategoryId = 'category-1'
    const service = new CategoryService(repository)

    await expect(
      service.resetSourceMapping('owner-1', '5411'),
    ).resolves.toMatchObject({
      code: '5411',
      mappedCategory: null,
      originalName: 'MCC 5411',
    })
    expect(repository.sourceCategoryId).toBeNull()
  })

  it('merges category mappings and transaction overrides into the target category', async () => {
    const repository = new FakeCategoryRepository()
    const service = new CategoryService(repository, () => 1_700_000_000)

    await service.merge('owner-1', 'category-1', 'category-2')

    expect(repository.mergeInput).toEqual({
      now: 1_700_000_000,
      sourceCategoryId: 'category-1',
      targetCategoryId: 'category-2',
      userId: 'owner-1',
    })
  })

  it('prevents deleting a category referenced by a global source mapping', async () => {
    const repository = new FakeCategoryRepository()
    repository.sourceCategoryId = 'category-1'
    const service = new CategoryService(repository)

    await expect(service.delete('owner-1', 'category-1')).rejects.toMatchObject(
      { code: 'category_referenced' },
    )
  })
})

class FakeCategoryRepository implements CategoryRepository {
  overrideCategoryId: string | null = null
  sourceCategoryId: string | null = null
  mergeInput: Record<string, unknown> | null = null
  readonly category = {
    colorToken: 'mint',
    icon: 'leaf',
    id: 'category-1',
    name: 'Shared meals',
  }
  readonly targetCategory = {
    colorToken: 'blue',
    icon: 'cart',
    id: 'category-2',
    name: 'Groceries',
  }
  readonly transaction = {
    id: 'transaction-1',
    originalCategoryCode: '5812',
    originalCategoryName: 'Restaurants',
    overrideCategory: null as typeof this.category | null,
    sourceCategory: null as typeof this.category | null,
  }

  async countOverrides() {
    return this.overrideCategoryId === null ? 0 : 1
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
    return categoryId === this.targetCategory.id
      ? this.targetCategory
      : this.category
  }
  async findOwnedTransaction() {
    return {
      ...this.transaction,
      overrideCategory: this.overrideCategoryId === null ? null : this.category,
      sourceCategory: this.sourceCategoryId === null ? null : this.category,
    }
  }
  async countSourceMappings() {
    return this.sourceCategoryId === null ? 0 : 1
  }
  async findSourceCategory(code: string) {
    return {
      code,
      mappedCategory: this.sourceCategoryId === null ? null : this.category,
      originalName: `MCC ${code}`,
      transactionCount: 2,
    }
  }
  async listCategories() {
    return [this.category]
  }
  async listSourceCategories() {
    return []
  }
  async mergeCategories(input: Record<string, unknown>) {
    this.mergeInput = input
  }
  async removeTransactionOverride() {
    this.overrideCategoryId = null
  }
  async setTransactionOverride(_transactionId: string, categoryId: string) {
    this.overrideCategoryId = categoryId
  }
  async setSourceMapping(_sourceCode: string, categoryId: string) {
    this.sourceCategoryId = categoryId
  }
  async removeSourceMapping() {
    this.sourceCategoryId = null
  }
  async updateCategory(
    _categoryId: string,
    _userId: string,
    input: { colorToken: string | null; icon: string | null; name: string },
  ) {
    return { ...this.category, ...input }
  }
}
