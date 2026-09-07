import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('./0003_monobank_api_rate_limits.sql', import.meta.url),
  'utf8',
)

describe('Monobank API rate-limit migration', () => {
  it('stores one durable request window per provider scope', () => {
    expect(migration).toContain('CREATE TABLE monobank_api_rate_limits')
    expect(migration).toContain('scope TEXT PRIMARY KEY')
    expect(migration).toContain('next_allowed_at INTEGER NOT NULL')
  })
})
