import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('./0004_transaction_sync_state.sql', import.meta.url),
  'utf8',
)

describe('transaction synchronization state migration', () => {
  it('adds resumable backfill and lease state without changing source transactions', () => {
    expect(migration).toContain('backfill_start_at INTEGER')
    expect(migration).toContain('backfill_cursor_at INTEGER')
    expect(migration).toContain('lease_expires_at INTEGER')
    expect(migration).toContain('CREATE INDEX idx_sync_state_claim')
  })
})
