import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('./0006_category_source_mappings.sql', import.meta.url),
  'utf8',
)

describe('category source mapping migration', () => {
  it('keeps one owner-scoped mapping for each immutable source category', () => {
    expect(migration).toContain('CREATE TABLE category_source_mappings')
    expect(migration).toContain('UNIQUE (user_id, original_category_code)')
    expect(migration).toContain(
      'FOREIGN KEY (category_id) REFERENCES categories',
    )
  })
})
