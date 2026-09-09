import type {
  CategoryRepository,
  CreateCategoryInput,
  CustomCategory,
  OwnedTransactionForCategory,
  SourceCategory,
  UpdateCategoryInput,
} from '../services/category-service'

export class D1CategoryRepository implements CategoryRepository {
  private readonly database: D1Database
  constructor(database: D1Database) {
    this.database = database
  }
  async listCategories(userId: string): Promise<CustomCategory[]> {
    return (
      await this.database
        .prepare(
          'SELECT id, name, icon, color_token AS colorToken FROM categories WHERE user_id = ? ORDER BY name COLLATE NOCASE',
        )
        .bind(userId)
        .all<CustomCategory>()
    ).results
  }
  async findCategory(
    categoryId: string,
    userId: string,
  ): Promise<CustomCategory | null> {
    return this.database
      .prepare(
        'SELECT id, name, icon, color_token AS colorToken FROM categories WHERE id = ? AND user_id = ?',
      )
      .bind(categoryId, userId)
      .first<CustomCategory>()
  }
  async createCategory(
    input: CreateCategoryInput & { userId: string; now: number },
  ): Promise<CustomCategory> {
    const category = {
      colorToken: input.colorToken,
      icon: input.icon,
      id: crypto.randomUUID(),
      name: input.name.trim(),
    }
    await this.database
      .prepare(
        'INSERT INTO categories (id, user_id, name, icon, color_token, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .bind(
        category.id,
        input.userId,
        category.name,
        category.icon,
        category.colorToken,
        input.now,
        input.now,
      )
      .run()
    return category
  }
  async updateCategory(
    categoryId: string,
    userId: string,
    input: UpdateCategoryInput & { now: number },
  ): Promise<CustomCategory | null> {
    await this.database
      .prepare(
        'UPDATE categories SET name = ?, icon = ?, color_token = ?, updated_at = ? WHERE id = ? AND user_id = ?',
      )
      .bind(
        input.name.trim(),
        input.icon,
        input.colorToken,
        input.now,
        categoryId,
        userId,
      )
      .run()
    return this.findCategory(categoryId, userId)
  }
  async countOverrides(categoryId: string, userId: string): Promise<number> {
    const row = await this.database
      .prepare(
        'SELECT COUNT(*) AS count FROM transaction_category_overrides WHERE category_id = ? AND user_id = ?',
      )
      .bind(categoryId, userId)
      .first<{ count: number }>()
    return row?.count ?? 0
  }
  async countSourceMappings(
    categoryId: string,
    userId: string,
  ): Promise<number> {
    const row = await this.database
      .prepare(
        'SELECT COUNT(*) AS count FROM category_source_mappings WHERE category_id = ? AND user_id = ?',
      )
      .bind(categoryId, userId)
      .first<{ count: number }>()
    return row?.count ?? 0
  }
  async deleteCategory(categoryId: string, userId: string): Promise<void> {
    await this.database
      .prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
      .bind(categoryId, userId)
      .run()
  }
  async findOwnedTransaction(
    transactionId: string,
    userId: string,
  ): Promise<OwnedTransactionForCategory | null> {
    const row = await this.database
      .prepare(
        `SELECT transactions.id, transactions.original_category_code AS originalCategoryCode, transactions.original_category_name AS originalCategoryName, categories.id AS overrideId, categories.name AS overrideName, categories.icon AS overrideIcon, categories.color_token AS overrideColorToken, mapped_categories.id AS mappedId, mapped_categories.name AS mappedName, mapped_categories.icon AS mappedIcon, mapped_categories.color_token AS mappedColorToken FROM transactions LEFT JOIN transaction_category_overrides ON transaction_category_overrides.transaction_id = transactions.id LEFT JOIN categories ON categories.id = transaction_category_overrides.category_id LEFT JOIN category_source_mappings ON category_source_mappings.user_id = transactions.user_id AND category_source_mappings.original_category_code = transactions.original_category_code LEFT JOIN categories AS mapped_categories ON mapped_categories.id = category_source_mappings.category_id WHERE transactions.id = ? AND transactions.user_id = ?`,
      )
      .bind(transactionId, userId)
      .first<CategoryTransactionRow>()
    return row === null
      ? null
      : {
          id: row.id,
          originalCategoryCode: row.originalCategoryCode,
          originalCategoryName: row.originalCategoryName,
          mappedCategory:
            row.mappedId === null
              ? null
              : {
                  id: row.mappedId,
                  name: row.mappedName ?? '',
                  icon: row.mappedIcon,
                  colorToken: row.mappedColorToken,
                },
          overrideCategory:
            row.overrideId === null
              ? null
              : {
                  id: row.overrideId,
                  name: row.overrideName ?? '',
                  icon: row.overrideIcon,
                  colorToken: row.overrideColorToken,
                },
        }
  }
  async setTransactionOverride(
    transactionId: string,
    categoryId: string,
    userId: string,
    now: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO transaction_category_overrides (id, transaction_id, category_id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(transaction_id) DO UPDATE SET category_id = excluded.category_id, updated_at = excluded.updated_at WHERE transaction_category_overrides.user_id = excluded.user_id`,
      )
      .bind(crypto.randomUUID(), transactionId, categoryId, userId, now, now)
      .run()
  }
  async removeTransactionOverride(
    transactionId: string,
    userId: string,
  ): Promise<void> {
    await this.database
      .prepare(
        'DELETE FROM transaction_category_overrides WHERE transaction_id = ? AND user_id = ?',
      )
      .bind(transactionId, userId)
      .run()
  }

  async listSourceCategories(userId: string): Promise<SourceCategory[]> {
    const rows = (
      await this.database
        .prepare(sourceCategoriesSql(''))
        .bind(userId)
        .all<SourceCategoryRow>()
    ).results
    return rows.map(mapSourceCategory)
  }

  async findSourceCategory(
    sourceCode: string,
    userId: string,
  ): Promise<SourceCategory | null> {
    const row = await this.database
      .prepare(
        sourceCategoriesSql('AND transactions.original_category_code = ?'),
      )
      .bind(userId, sourceCode)
      .first<SourceCategoryRow>()
    return row === null ? null : mapSourceCategory(row)
  }

  async setSourceMapping(
    sourceCode: string,
    categoryId: string,
    userId: string,
    now: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO category_source_mappings (id, user_id, original_category_code, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, original_category_code) DO UPDATE SET category_id = excluded.category_id, updated_at = excluded.updated_at`,
      )
      .bind(crypto.randomUUID(), userId, sourceCode, categoryId, now, now)
      .run()
  }

  async removeSourceMapping(sourceCode: string, userId: string): Promise<void> {
    await this.database
      .prepare(
        'DELETE FROM category_source_mappings WHERE original_category_code = ? AND user_id = ?',
      )
      .bind(sourceCode, userId)
      .run()
  }
}
interface CategoryTransactionRow {
  id: string
  originalCategoryCode: string | null
  originalCategoryName: string | null
  overrideId: string | null
  overrideName: string | null
  overrideIcon: string | null
  overrideColorToken: string | null
  mappedId: string | null
  mappedName: string | null
  mappedIcon: string | null
  mappedColorToken: string | null
}

interface SourceCategoryRow {
  code: string
  originalName: string | null
  transactionCount: number
  mappedId: string | null
  mappedName: string | null
  mappedIcon: string | null
  mappedColorToken: string | null
}

function sourceCategoriesSql(extraCondition: string): string {
  return `SELECT transactions.original_category_code AS code,
    MAX(transactions.original_category_name) AS originalName,
    COUNT(*) AS transactionCount,
    mapped_categories.id AS mappedId,
    mapped_categories.name AS mappedName,
    mapped_categories.icon AS mappedIcon,
    mapped_categories.color_token AS mappedColorToken
  FROM transactions
  LEFT JOIN category_source_mappings
    ON category_source_mappings.user_id = transactions.user_id
   AND category_source_mappings.original_category_code = transactions.original_category_code
  LEFT JOIN categories AS mapped_categories
    ON mapped_categories.id = category_source_mappings.category_id
  WHERE transactions.user_id = ?
    AND transactions.original_category_code IS NOT NULL
    ${extraCondition}
  GROUP BY transactions.original_category_code, mapped_categories.id,
    mapped_categories.name, mapped_categories.icon, mapped_categories.color_token
  ORDER BY transactionCount DESC, originalName COLLATE NOCASE`
}

function mapSourceCategory(row: SourceCategoryRow): SourceCategory {
  return {
    code: row.code,
    originalName: row.originalName ?? row.code,
    transactionCount: row.transactionCount,
    mappedCategory:
      row.mappedId === null
        ? null
        : {
            id: row.mappedId,
            name: row.mappedName ?? '',
            icon: row.mappedIcon,
            colorToken: row.mappedColorToken,
          },
  }
}
