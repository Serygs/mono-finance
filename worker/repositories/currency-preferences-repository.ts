export interface CurrencyPreferencesRepository {
  getBaseCurrency(userId: string): Promise<string>
  saveBaseCurrency(
    userId: string,
    currencyCode: string,
    now: number,
  ): Promise<void>
}

export class D1CurrencyPreferencesRepository implements CurrencyPreferencesRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async getBaseCurrency(userId: string): Promise<string> {
    const row = await this.database
      .prepare(
        'SELECT analytics_base_currency_code FROM user_preferences WHERE user_id = ?',
      )
      .bind(userId)
      .first<{ analytics_base_currency_code: string }>()
    return row?.analytics_base_currency_code ?? 'UAH'
  }

  async saveBaseCurrency(
    userId: string,
    currencyCode: string,
    now: number,
  ): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO user_preferences (user_id, analytics_base_currency_code, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET analytics_base_currency_code = excluded.analytics_base_currency_code, updated_at = excluded.updated_at`,
      )
      .bind(userId, currencyCode, now)
      .run()
  }
}
