export interface CustomCategory {
  colorToken: string | null
  icon: string | null
  id: string
  name: string
}

export interface OwnedTransactionForCategory {
  id: string
  originalCategoryCode: string | null
  originalCategoryName: string | null
  mappedCategory: CustomCategory | null
  overrideCategory: CustomCategory | null
}

export interface SourceCategory {
  code: string
  originalName: string
  transactionCount: number
  mappedCategory: CustomCategory | null
}
export interface SourceCategoryQuery {
  mapping: 'all' | 'mapped' | 'unmapped'
  page: number
  pageSize: number
  query: string
}
export interface SourceCategoryPage {
  page: number
  pageSize: number
  sources: SourceCategory[]
  totalItems: number
}

export interface CategoryRepository {
  countOverrides(categoryId: string, userId: string): Promise<number>
  countSourceMappings(categoryId: string, userId: string): Promise<number>
  createCategory(
    input: CreateCategoryInput & { userId: string; now: number },
  ): Promise<CustomCategory>
  deleteCategory(categoryId: string, userId: string): Promise<void>
  findCategory(
    categoryId: string,
    userId: string,
  ): Promise<CustomCategory | null>
  findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<OwnedTransactionForCategory | null>
  findSourceCategory(
    sourceCode: string,
    userId: string,
  ): Promise<SourceCategory | null>
  listCategories(userId: string): Promise<CustomCategory[]>
  listSourceCategories(userId: string): Promise<SourceCategory[]>
  mergeCategories(
    sourceCategoryId: string,
    targetCategoryId: string,
    userId: string,
    now: number,
  ): Promise<void>
  removeSourceMapping(sourceCode: string, userId: string): Promise<void>
  removeTransactionOverride(
    transactionId: string,
    userId: string,
  ): Promise<void>
  setTransactionOverride(
    transactionId: string,
    categoryId: string,
    userId: string,
    now: number,
  ): Promise<void>
  setSourceMapping(
    sourceCode: string,
    categoryId: string,
    userId: string,
    now: number,
  ): Promise<void>
  updateCategory(
    categoryId: string,
    userId: string,
    input: UpdateCategoryInput & { now: number },
  ): Promise<CustomCategory | null>
}

export interface CreateCategoryInput {
  name: string
  icon: string | null
  colorToken: string | null
}
export type UpdateCategoryInput = CreateCategoryInput

export class CategoryError extends Error {
  readonly code:
    | 'category_not_found'
    | 'category_referenced'
    | 'invalid_category'
    | 'transaction_not_found'
  constructor(
    code:
      | 'category_not_found'
      | 'category_referenced'
      | 'invalid_category'
      | 'transaction_not_found',
  ) {
    super(code)
    this.code = code
  }
}

export class CategoryService {
  private readonly repository: CategoryRepository
  private readonly now: () => number
  constructor(
    repository: CategoryRepository,
    now: () => number = () => Math.floor(Date.now() / 1_000),
  ) {
    this.repository = repository
    this.now = now
  }

  list(userId: string): Promise<CustomCategory[]> {
    return this.repository.listCategories(userId)
  }

  async listSources(
    userId: string,
    input: SourceCategoryQuery,
  ): Promise<SourceCategoryPage> {
    const normalizedQuery = input.query.trim().toLocaleLowerCase()
    const matching = (
      await this.repository.listSourceCategories(userId)
    ).filter(
      (source) =>
        (input.mapping === 'all' ||
          (input.mapping === 'mapped') === (source.mappedCategory !== null)) &&
        (normalizedQuery === '' ||
          source.code.toLocaleLowerCase().includes(normalizedQuery) ||
          source.originalName.toLocaleLowerCase().includes(normalizedQuery)),
    )
    const start = (input.page - 1) * input.pageSize
    return {
      page: input.page,
      pageSize: input.pageSize,
      sources: matching.slice(start, start + input.pageSize),
      totalItems: matching.length,
    }
  }

  create(userId: string, input: CreateCategoryInput): Promise<CustomCategory> {
    assertCategoryInput(input)
    return this.repository.createCategory({ ...input, now: this.now(), userId })
  }

  async update(
    userId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<CustomCategory> {
    assertCategoryInput(input)
    const category = await this.repository.updateCategory(categoryId, userId, {
      ...input,
      now: this.now(),
    })
    if (category === null) throw new CategoryError('category_not_found')
    return category
  }

  async delete(userId: string, categoryId: string): Promise<void> {
    if ((await this.repository.findCategory(categoryId, userId)) === null)
      throw new CategoryError('category_not_found')
    if (
      (await this.repository.countOverrides(categoryId, userId)) > 0 ||
      (await this.repository.countSourceMappings(categoryId, userId)) > 0
    )
      throw new CategoryError('category_referenced')
    await this.repository.deleteCategory(categoryId, userId)
  }

  async merge(
    userId: string,
    sourceCategoryId: string,
    targetCategoryId: string,
  ): Promise<CustomCategory> {
    if (sourceCategoryId === targetCategoryId)
      throw new CategoryError('invalid_category')
    const [source, target] = await Promise.all([
      this.repository.findCategory(sourceCategoryId, userId),
      this.repository.findCategory(targetCategoryId, userId),
    ])
    if (source === null || target === null)
      throw new CategoryError('category_not_found')
    await this.repository.mergeCategories(
      sourceCategoryId,
      targetCategoryId,
      userId,
      this.now(),
    )
    return target
  }

  async setTransactionOverride(
    userId: string,
    transactionId: string,
    categoryId: string,
  ): Promise<EffectiveCategoryResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    const category = await this.repository.findCategory(categoryId, userId)
    if (category === null) throw new CategoryError('category_not_found')
    await this.repository.setTransactionOverride(
      transactionId,
      categoryId,
      userId,
      this.now(),
    )
    return resolveEffectiveCategory({
      ...transaction,
      overrideCategory: category,
    })
  }

  async resetTransactionOverride(
    userId: string,
    transactionId: string,
  ): Promise<EffectiveCategoryResult> {
    const transaction = await this.requiredTransaction(transactionId, userId)
    await this.repository.removeTransactionOverride(transactionId, userId)
    return resolveEffectiveCategory({ ...transaction, overrideCategory: null })
  }

  async setSourceMapping(
    userId: string,
    sourceCode: string,
    categoryId: string,
  ): Promise<SourceCategory> {
    assertSourceCode(sourceCode)
    const [source, category] = await Promise.all([
      this.repository.findSourceCategory(sourceCode, userId),
      this.repository.findCategory(categoryId, userId),
    ])
    if (source === null) throw new CategoryError('category_not_found')
    if (category === null) throw new CategoryError('category_not_found')
    await this.repository.setSourceMapping(
      sourceCode,
      categoryId,
      userId,
      this.now(),
    )
    return { ...source, mappedCategory: category }
  }

  async resetSourceMapping(
    userId: string,
    sourceCode: string,
  ): Promise<SourceCategory> {
    assertSourceCode(sourceCode)
    const source = await this.repository.findSourceCategory(sourceCode, userId)
    if (source === null) throw new CategoryError('category_not_found')
    await this.repository.removeSourceMapping(sourceCode, userId)
    return { ...source, mappedCategory: null }
  }

  resolveForAnalytics(
    transaction: OwnedTransactionForCategory,
  ): EffectiveCategoryResult {
    return resolveEffectiveCategory(transaction)
  }

  private async requiredTransaction(transactionId: string, userId: string) {
    const transaction = await this.repository.findOwnedTransaction(
      transactionId,
      userId,
    )
    if (transaction === null) throw new CategoryError('transaction_not_found')
    return transaction
  }
}

export interface EffectiveCategoryResult {
  category: {
    id: string | null
    name: string | null
    source: 'custom' | 'mapped' | 'original' | null
  }
  originalCategory: { id: string | null; name: string | null }
}

export function resolveEffectiveCategory(
  transaction: OwnedTransactionForCategory,
): EffectiveCategoryResult {
  const originalCategory = {
    id: transaction.originalCategoryCode,
    name: transaction.originalCategoryName,
  }
  const effectiveCategory =
    transaction.overrideCategory ?? transaction.mappedCategory
  return effectiveCategory === null
    ? {
        category:
          originalCategory.name === null
            ? { ...originalCategory, source: null }
            : { ...originalCategory, source: 'original' },
        originalCategory,
      }
    : {
        category: {
          id: effectiveCategory.id,
          name: effectiveCategory.name,
          source: transaction.overrideCategory === null ? 'mapped' : 'custom',
        },
        originalCategory,
      }
}

function assertSourceCode(value: string): void {
  if (!value.trim() || value.length > 128)
    throw new CategoryError('invalid_category')
}

function assertCategoryInput(input: CreateCategoryInput): void {
  if (
    !input.name.trim() ||
    input.name.length > 80 ||
    !isOptionalToken(input.icon, 32) ||
    !isOptionalToken(input.colorToken, 32)
  )
    throw new CategoryError('invalid_category')
}
function isOptionalToken(value: string | null, max: number): boolean {
  return (
    value === null ||
    (value.trim().length > 0 &&
      value.length <= max &&
      /^[a-z0-9-]+$/i.test(value))
  )
}
