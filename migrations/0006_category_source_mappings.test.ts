import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  fileURLToPath(
    new URL('./0006_category_source_mappings.sql', import.meta.url),
  ),
  'utf8',
)

describe('category source mapping migration', () => {
  it('stores one owner-scoped effective category for each immutable source code', () => {
    expect(migration).toContain('CREATE TABLE category_source_mappings')
    expect(migration).toContain('UNIQUE (user_id, original_category_code)')
    expect(migration).toContain(
      'FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT',
    )
  })

  it('indexes mapped categories for merge and deletion checks', () => {
    expect(migration).toContain(
      'CREATE INDEX idx_category_source_mappings_category_id',
    )
  })
})
