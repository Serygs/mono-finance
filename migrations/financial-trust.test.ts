import { readFileSync, readdirSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { D1TransactionsRepository } from '../worker/repositories/transactions-repository'
import { D1AccountsRepository } from '../worker/repositories/accounts-repository'
import { D1TransactionSyncRepository } from '../worker/repositories/transaction-sync-repository'
import { D1AnalyticsRepository } from '../worker/repositories/analytics-repository'
import { AnalyticsService } from '../worker/services/analytics-service'

function fixture() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('PRAGMA foreign_keys = ON')
  const migrations = new URL('./', import.meta.url)
  for (const file of readdirSync(migrations)
    .filter((file) => file.endsWith('.sql'))
    .sort())
    sqlite.exec(readFileSync(new URL(file, migrations), 'utf8'))
  sqlite.exec(`INSERT INTO users(id,email,password_hash) VALUES ('owner','synthetic@example.com','test-only');
    INSERT INTO currencies(code,numeric_code,minor_unit,display_name) VALUES ('UAH','980',2,'UAH');
    INSERT INTO accounts(id,user_id,monobank_account_id,type,currency_code) VALUES ('a','owner','provider-a','black','UAH');
    INSERT INTO sync_state(id,account_id) VALUES ('s','a');`)
  function statement(sql: string, bindings: (number | string | null)[] = []) {
    return {
      bind: (...values: (number | string | null)[]) => statement(sql, values),
      all: async () => ({ results: sqlite.prepare(sql).all(...bindings) }),
      first: async () => sqlite.prepare(sql).get(...bindings) ?? null,
      run: async () => ({
        meta: { changes: Number(sqlite.prepare(sql).run(...bindings).changes) },
      }),
    }
  }
  const database = {
    prepare: statement,
    batch: async (statements: Array<ReturnType<typeof statement>>) => {
      sqlite.exec('BEGIN')
      try {
        const results = await Promise.all(statements.map((item) => item.run()))
        sqlite.exec('COMMIT')
        return results
      } catch (error) {
        sqlite.exec('ROLLBACK')
        throw error
      }
    },
  } as unknown as D1Database
  return { sqlite, database }
}

describe('financial trust repository contracts on SQLite', () => {
  it('queries exact effective category identity across cursor pages and matches overview/category totals', async () => {
    const { sqlite, database } = fixture()
    for (const [id, amount, category] of [
      ['t1', -3890, '5411'],
      ['t2', -1000, '5411'],
      ['t3', -5110, '9999'],
      ['t4', -3000, '5411'],
    ] as const) {
      sqlite
        .prepare(
          `INSERT INTO transactions(id,user_id,account_id,monobank_transaction_id,original_amount_minor,original_currency_code,original_description,original_timestamp,original_category_code,original_category_name,direction) VALUES (?, 'owner','a',?,?,'UAH','Synthetic merchant',150,?,'Same display name','expense')`,
        )
        .run(id, id, amount, category)
    }
    sqlite.exec(`INSERT INTO transaction_adjustments(id,transaction_id,user_id,adjusted_amount_minor) VALUES ('adjustment','t1','owner',-4890);
      INSERT INTO transaction_exclusions(id,transaction_id,user_id) VALUES ('exclusion','t4','owner');`)
    const list = new D1TransactionsRepository(database)
    const query = {
      accountIds: ['a'],
      category: null,
      categoryIdentity: { kind: 'id' as const, id: '5411' },
      currency: 'UAH',
      dateFrom: 100,
      dateTo: 200,
      direction: 'expense' as const,
      excluded: false,
      search: null,
      userId: 'owner',
      limit: 1,
      cursor: null,
    }
    const first = await list.list(query)
    const second = await list.list({ ...query, cursor: first.nextCursor })
    expect([first.transactions[0]?.id, second.transactions[0]?.id]).toEqual([
      't2',
      't1',
    ])
    expect(second.nextCursor).toBeNull()
    const service = new AnalyticsService(
      new D1AnalyticsRepository(database),
      () => 200,
    )
    const filters = {
      accountIds: ['a'],
      dateFrom: 100,
      dateTo: 200,
      userId: 'owner',
    }
    const [overview, breakdowns] = await Promise.all([
      service.overview(filters),
      service.breakdowns(filters),
    ])
    expect(
      breakdowns.expensesByCategory.reduce(
        (sum, row) => sum + BigInt(row.amountMinor),
        0n,
      ),
    ).toBe(BigInt(overview.totals[0]!.expenseAmountMinor))
    expect(
      breakdowns.expensesByCategory.find((row) => row.categoryId === '5411')
        ?.amountMinor,
    ).toBe(5890)
    sqlite.close()
  })
  it('leaves legacy balance time unknown and stamps only returned accounts after successful persistence', async () => {
    const { sqlite, database } = fixture()
    const accounts = new D1AccountsRepository(database, () => 500)
    expect((await accounts.listByUser('owner'))[0]?.balanceUpdatedAt).toBeNull()
    await accounts.synchronize('owner', [
      {
        providerAccountId: 'provider-a',
        accountType: 'black',
        currencyNumericCode: '980',
        balanceMinor: 1000,
        creditLimitMinor: 2000,
        maskedPans: [],
      },
    ])
    expect((await accounts.listByUser('owner'))[0]?.balanceUpdatedAt).toBe(500)
    await accounts.synchronize('owner', [])
    expect((await accounts.listByUser('owner'))[0]).toMatchObject({
      balanceUpdatedAt: 500,
      isActive: false,
      balanceMinor: 1000,
    })
    sqlite.close()
  })
  it('rolls back interval evidence when completion metadata fails', async () => {
    const { sqlite, database } = fixture()
    const sync = new D1TransactionSyncRepository(database)
    sqlite.exec(
      `CREATE TRIGGER reject_sync BEFORE UPDATE ON sync_state BEGIN SELECT RAISE(ABORT, 'synthetic persistence failure'); END;`,
    )
    await expect(
      sync.completeWindow({
        accountId: 'a',
        backfillCursorAt: 100,
        lastSyncedTransactionAt: null,
        nowEpochSeconds: 300,
        window: { fromEpochSeconds: 100, toEpochSeconds: 199 },
      }),
    ).rejects.toThrow()
    const state = (await sync.listStatusByUser('owner'))[0]!
    expect(state.coverageIntervals).toEqual([])
    expect(state.lastSuccessfulSyncAt).toBeNull()
    sqlite.close()
  })
  it('commits interval evidence with successful import time and never advances it on no-op/failure', async () => {
    const { sqlite, database } = fixture()
    const sync = new D1TransactionSyncRepository(database)
    expect(
      (await sync.listStatusByUser('owner'))[0]?.coverageIntervals,
    ).toEqual([])
    await sync.completeWindow({
      accountId: 'a',
      backfillCursorAt: 100,
      lastSyncedTransactionAt: null,
      nowEpochSeconds: 300,
      window: { fromEpochSeconds: 100, toEpochSeconds: 199 },
    })
    await sync.completeWindow({
      accountId: 'a',
      backfillCursorAt: 201,
      lastSyncedTransactionAt: null,
      nowEpochSeconds: 400,
      window: { fromEpochSeconds: 201, toEpochSeconds: 299 },
    })
    await sync.completeEmptyWindow('a', 500)
    await sync.failWindow('a', 'timeout', 600)
    const state = (await sync.listStatusByUser('owner'))[0]!
    expect(state.lastSuccessfulSyncAt).toBe(400)
    expect(state.coverageIntervals).toHaveLength(2)
    expect(state.coverageIntervals?.[0]).toEqual({
      fromEpochSeconds: 100,
      toEpochSeconds: 199,
      completedAt: 300,
    })
    sqlite.close()
  })
})
