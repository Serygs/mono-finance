import type {
  CategoryRepository,
  CreateCategoryInput,
  CustomCategory,
  OwnedTransactionForCategory,
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
        `SELECT transactions.id, transactions.original_category_code AS originalCategoryCode, transactions.original_category_name AS originalCategoryName, categories.id AS overrideId, categories.name AS overrideName, categories.icon AS overrideIcon, categories.color_token AS overrideColorToken FROM transactions LEFT JOIN transaction_category_overrides ON transaction_category_overrides.transaction_id = transactions.id LEFT JOIN categories ON categories.id = transaction_category_overrides.category_id WHERE transactions.id = ? AND transactions.user_id = ?`,
      )
      .bind(transactionId, userId)
      .first<CategoryTransactionRow>()
    return row === null
      ? null
      : {
          id: row.id,
          originalCategoryCode: row.originalCategoryCode,
          originalCategoryName: row.originalCategoryName,
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
}
interface CategoryTransactionRow {
  id: string
  originalCategoryCode: string | null
  originalCategoryName: string | null
  overrideId: string | null
  overrideName: string | null
  overrideIcon: string | null
  overrideColorToken: string | null
}
