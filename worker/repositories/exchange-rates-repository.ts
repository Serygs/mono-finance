import type { ExchangeRateSourceRecord } from '../exchange-rates/exchange-rate-source'

export interface ExchangeRatesRepository {
  upsert(records: ExchangeRateSourceRecord[]): Promise<void>
}

export class D1ExchangeRatesRepository implements ExchangeRatesRepository {
  private readonly database: D1Database

  constructor(database: D1Database) {
    this.database = database
  }

  async upsert(records: ExchangeRateSourceRecord[]): Promise<void> {
    if (records.length === 0) return
    const statements: D1PreparedStatement[] = []
    for (const record of records) {
      statements.push(
        this.database
          .prepare(
            `INSERT INTO currencies (code, numeric_code, display_name, minor_unit, created_at, updated_at)
          VALUES (?, ?, ?, ?, unixepoch(), unixepoch()) ON CONFLICT(code) DO NOTHING`,
          )
          .bind(
            record.sourceCurrencyCode,
            record.sourceCurrencyNumericCode,
            record.sourceCurrencyDisplayName,
            record.sourceCurrencyMinorUnit,
          ),
        this.database
          .prepare(
            `INSERT INTO currencies (code, numeric_code, display_name, minor_unit, created_at, updated_at)
          VALUES (?, ?, ?, ?, unixepoch(), unixepoch()) ON CONFLICT(code) DO NOTHING`,
          )
          .bind(
            record.targetCurrencyCode,
            record.targetCurrencyNumericCode,
            record.targetCurrencyDisplayName,
            record.targetCurrencyMinorUnit,
          ),
        this.database
          .prepare(
            `INSERT INTO exchange_rates (id, source_currency_code, target_currency_code, rate_numerator, rate_denominator, rate_at, source)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_currency_code, target_currency_code, rate_at, source)
          DO NOTHING`,
          )
          .bind(
            crypto.randomUUID(),
            record.sourceCurrencyCode,
            record.targetCurrencyCode,
            record.rateNumerator,
            record.rateDenominator,
            record.rateAt,
            record.source,
          ),
      )
    }
    await this.database.batch(statements)
  }
}
