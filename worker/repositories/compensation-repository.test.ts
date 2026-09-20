import { describe, expect, it } from 'vitest'

import { D1CompensationRepository } from './compensation-repository'

describe('D1CompensationRepository', () => {
  it('returns partially allocated income with its allocated amount and does not limit candidates', async () => {
    const database = databaseReturning([
      {
        allocated_amount_minor: 400,
        direction: 'income',
        id: 'income-101',
        original_amount_minor: 1_000,
        original_currency_code: 'UAH',
        original_description: 'Refund',
        original_timestamp: 1_700_000_000,
      },
    ])

    await expect(
      new D1CompensationRepository(database.binding).findIncomeCandidates(
        'owner-1',
        'UAH',
      ),
    ).resolves.toEqual([
      expect.objectContaining({
        allocatedAmountMinor: 400,
        id: 'income-101',
      }),
    ])
    expect(database.sql).toContain('LEFT JOIN compensation_links')
    expect(database.sql).toContain('HAVING transactions.original_amount_minor')
    expect(database.sql).not.toContain('LIMIT 100')
  })
})

function databaseReturning(rows: Record<string, unknown>[]) {
  const state = { sql: '' }
  const binding = {
    prepare(sql: string) {
      state.sql = sql
      return {
        bind() {
          return {
            async all() {
              return { results: rows }
            },
          }
        },
      }
    },
  } as unknown as D1Database
  return {
    binding,
    get sql() {
      return state.sql
    },
  }
}
