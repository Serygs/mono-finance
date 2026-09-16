import { describe, expect, it } from 'vitest'

import { D1AnalyticsRepository } from './analytics-repository'
import { D1TransactionsRepository } from './transactions-repository'

describe('effective category repository projections', () => {
  it('returns the mapped category while preserving the imported category', async () => {
    const database = databaseReturning([
      {
        account_id: 'account-1',
        account_type: 'black',
        adjustment_note: null,
        card_masked_pan: null,
        category_id: '5411',
        category_name: 'MCC 5411',
        currency_minor_unit: 2,
        custom_category_id: null,
        custom_category_color_token: null,
        custom_category_icon: null,
        custom_category_name: null,
        effective_amount_minor: -1_000,
        exclusion_reason: null,
        has_adjustment: 0,
        has_compensation: 0,
        id: 'transaction-1',
        is_excluded: 0,
        mapped_category_id: 'groceries',
        mapped_category_color_token: 'mint',
        mapped_category_icon: 'groceries',
        mapped_category_name: 'Groceries',
        original_amount_minor: -1_000,
        original_currency_code: 'UAH',
        original_description: 'Market',
        original_mcc: 5411,
        original_timestamp: 1_700_000_000,
      },
    ])

    const result = await new D1TransactionsRepository(database.binding).list({
      accountIds: [],
      category: null,
      currency: null,
      cursor: null,
      dateFrom: null,
      dateTo: null,
      direction: null,
      excluded: null,
      limit: 20,
      search: null,
      userId: 'owner-1',
    })

    expect(result.transactions[0]).toMatchObject({
      category: {
        colorToken: 'mint',
        icon: 'groceries',
        id: 'groceries',
        name: 'Groceries',
        source: 'mapped',
      },
      originalCategory: { id: '5411', name: 'MCC 5411' },
    })
    expect(database.sql).toContain('category_source_mappings')
  })

  it('projects source mappings into analytics after transaction overrides', async () => {
    const database = databaseReturning([
      {
        account_id: 'account-1',
        category_id: '5732',
        category_name: 'Продаж електронного обладнання',
        compensation_amount_minor: 0,
        direction: 'expense',
        effective_amount_minor: -1_000,
        id: 'transaction-1',
        is_excluded: 0,
        original_amount_minor: -1_000,
        original_currency_code: 'UAH',
        original_description: 'Device',
        original_timestamp: 1,
      },
    ])

    const result = await new D1AnalyticsRepository(
      database.binding,
    ).listResolvedTransactions({
      accountIds: [],
      dateFrom: 1,
      dateTo: 2,
      userId: 'owner-1',
    })

    expect(result[0]).toMatchObject({
      categoryId: '5732',
      categoryName: 'Продаж електронного обладнання',
    })
    expect(database.sql).toContain(
      'COALESCE(override_categories.name, mapped_categories.name, transactions.original_category_name)',
    )
    expect(database.sql).toContain('category_source_mappings')
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
