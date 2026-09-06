import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('./0001_initial_schema.sql', import.meta.url),
  'utf8',
)

describe('initial D1 schema', () => {
  it('protects immutable Monobank transaction identity and source fields', () => {
    expect(migration).toContain('UNIQUE (monobank_transaction_id)')
    expect(migration).toContain(
      'CREATE TRIGGER prevent_imported_transaction_source_update',
    )
    expect(migration).toContain('original_amount_minor INTEGER NOT NULL')
    expect(migration).toContain('original_currency_code TEXT NOT NULL')
    expect(migration).toContain('original_description TEXT NOT NULL')
    expect(migration).toContain('original_mcc INTEGER')
    expect(migration).toContain('original_timestamp INTEGER NOT NULL')
  })

  it('defines the core financial tables and query indexes', () => {
    for (const table of [
      'users',
      'sessions',
      'accounts',
      'currencies',
      'transactions',
      'transaction_adjustments',
      'transaction_exclusions',
      'categories',
      'transaction_category_overrides',
      'compensation_links',
      'sync_state',
      'exchange_rates',
    ]) {
      expect(migration).toContain(`CREATE TABLE ${table}`)
    }

    expect(migration).toContain(
      'CREATE INDEX idx_transactions_original_timestamp',
    )
    expect(migration).toContain('CREATE INDEX idx_transactions_account_id')
    expect(migration).toContain('CREATE INDEX idx_transactions_direction')
    expect(migration).toContain(
      'CREATE INDEX idx_transactions_original_category',
    )
    expect(migration).toContain(
      'CREATE INDEX idx_transactions_monobank_transaction_id',
    )
  })

  it('models corrections and compensation separately from bank transactions', () => {
    expect(migration).toContain('adjusted_amount_minor INTEGER NOT NULL')
    expect(migration).toContain('is_excluded INTEGER NOT NULL DEFAULT 1')
    expect(migration).toContain('transaction_id TEXT NOT NULL UNIQUE')
    expect(migration).toContain('compensated_amount_minor INTEGER NOT NULL')
    expect(migration).toContain(
      'Compensation exceeds the incoming transaction amount',
    )
    expect(migration).toContain('rate_numerator INTEGER NOT NULL')
    expect(migration).toContain('rate_denominator INTEGER NOT NULL')
  })
})
