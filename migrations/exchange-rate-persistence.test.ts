import { readFileSync } from 'node:fs'
import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from 'node:sqlite'
import { fileURLToPath, URL as NodeUrl } from 'node:url'

import { describe, expect, it } from 'vitest'

import { D1ExchangeRatesRepository } from '../worker/repositories/exchange-rates-repository'

const initialMigration = readFileSync(
  fileURLToPath(new NodeUrl('./0001_initial_schema.sql', import.meta.url)),
  'utf8',
)

describe('D1ExchangeRatesRepository', () => {
  it('preserves the first stored historical rate when the provider repeats its source timestamp', async () => {
    const sqlite = new DatabaseSync(':memory:')
    sqlite.exec('PRAGMA foreign_keys = ON')
    sqlite.exec(initialMigration)
    const repository = new D1ExchangeRatesRepository(asD1Database(sqlite))

    await repository.upsert([rate(4_000)])
    await repository.upsert([rate(4_100)])

    expect(
      sqlite
        .prepare(
          'SELECT rate_numerator, rate_denominator FROM exchange_rates WHERE source_currency_code = ? AND target_currency_code = ?',
        )
        .get('USD', 'UAH'),
    ).toEqual({ rate_denominator: 100, rate_numerator: 4_000 })
  })
})

function rate(rateNumerator: number) {
  return {
    rateAt: 1_700_000_000,
    rateDenominator: 100,
    rateNumerator,
    source: 'test-source',
    sourceCurrencyCode: 'USD',
    sourceCurrencyDisplayName: 'US Dollar',
    sourceCurrencyMinorUnit: 2,
    sourceCurrencyNumericCode: '840',
    targetCurrencyCode: 'UAH',
    targetCurrencyDisplayName: 'Ukrainian Hryvnia',
    targetCurrencyMinorUnit: 2,
    targetCurrencyNumericCode: '980',
  }
}

function asD1Database(database: DatabaseSync): D1Database {
  return {
    batch: async (statements: D1PreparedStatement[]) => {
      database.exec('BEGIN')
      try {
        const results = []
        for (const statement of statements) {
          results.push(
            await (statement as unknown as SqliteD1Statement).executeRun(),
          )
        }
        database.exec('COMMIT')
        return results
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
    prepare: (query: string) =>
      new SqliteD1Statement(
        database.prepare(query),
      ) as unknown as D1PreparedStatement,
  } as unknown as D1Database
}

class SqliteD1Statement {
  private values: SQLInputValue[] = []
  private readonly statement: StatementSync

  constructor(statement: StatementSync) {
    this.statement = statement
  }

  bind(...values: unknown[]) {
    this.values = values as SQLInputValue[]
    return this
  }

  async executeRun() {
    const result = this.statement.run(...this.values)
    return { meta: { changes: result.changes } }
  }
}
