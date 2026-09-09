import { readFileSync } from 'node:fs'
import {
  DatabaseSync,
  type SQLInputValue,
  type StatementSync,
} from 'node:sqlite'
import { fileURLToPath, URL as NodeUrl } from 'node:url'

import { beforeEach, describe, expect, it } from 'vitest'

import type { AccountSourceRecord } from '../worker/monobank/internal-dtos'
import { D1AccountsRepository } from '../worker/repositories/accounts-repository'
import { D1TransactionSyncRepository } from '../worker/repositories/transaction-sync-repository'

const initialMigration = readFileSync(
  fileURLToPath(new NodeUrl('./0001_initial_schema.sql', import.meta.url)),
  'utf8',
)
const transactionSyncMigration = readFileSync(
  fileURLToPath(
    new NodeUrl('./0004_transaction_sync_state.sql', import.meta.url),
  ),
  'utf8',
)

describe('D1AccountsRepository', () => {
  let sqlite: DatabaseSync
  let repository: D1AccountsRepository

  beforeEach(() => {
    sqlite = new DatabaseSync(':memory:')
    sqlite.exec('PRAGMA foreign_keys = ON')
    sqlite.exec(initialMigration)
    sqlite.exec(transactionSyncMigration)
    sqlite
      .prepare(
        `INSERT INTO users (id, email, password_hash)
         VALUES (?, ?, ?)`,
      )
      .run('owner-1', 'owner@example.com', 'not-a-real-hash')
    repository = new D1AccountsRepository(asD1Database(sqlite))
  })

  it('upserts all currencies, accounts, and cards without duplicates', async () => {
    const firstSnapshot = [
      account({
        providerAccountId: 'mono-uah',
        currencyNumericCode: '980',
        maskedPans: ['537541******1234', '537541******1234'],
      }),
      account({
        providerAccountId: 'mono-gbp',
        currencyNumericCode: '826',
        maskedPans: [],
      }),
    ]

    await repository.synchronize('owner-1', firstSnapshot)
    await repository.synchronize('owner-1', firstSnapshot)

    const stored = await repository.listByUser('owner-1')
    expect(stored).toHaveLength(2)
    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cards: [expect.objectContaining({ maskedPan: '537541******1234' })],
          currency: expect.objectContaining({
            code: 'UAH',
            numericCode: '980',
          }),
          isActive: true,
        }),
        expect.objectContaining({
          currency: expect.objectContaining({
            code: 'GBP',
            minorUnit: 2,
            numericCode: '826',
          }),
          isActive: true,
        }),
      ]),
    )
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM accounts').get(),
    ).toEqual({ count: 2 })
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM account_cards').get(),
    ).toEqual({ count: 1 })
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM sync_state').get(),
    ).toEqual({ count: 2 })
  })

  it('marks disappeared accounts inactive without deleting their transactions', async () => {
    await repository.synchronize('owner-1', [
      account({
        providerAccountId: 'mono-uah',
        currencyNumericCode: '980',
        maskedPans: ['537541******1234'],
      }),
      account({
        providerAccountId: 'mono-eur',
        currencyNumericCode: '978',
      }),
    ])
    const before = await repository.listByUser('owner-1')
    const uahAccount = before.find(
      (item) => item.currency.numericCode === '980',
    )!
    sqlite
      .prepare(
        `INSERT INTO transactions (
           id, user_id, account_id, monobank_transaction_id,
           original_amount_minor, original_currency_code,
           original_description, original_timestamp, direction
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        'transaction-1',
        'owner-1',
        uahAccount.id,
        'mono-transaction-1',
        -10_000,
        'UAH',
        'Immutable expense',
        1_700_000_000,
        'expense',
      )

    await repository.synchronize('owner-1', [
      account({
        balanceMinor: 99_900,
        providerAccountId: 'mono-eur',
        currencyNumericCode: '978',
      }),
    ])

    const after = await repository.listByUser('owner-1')
    expect(after.find((item) => item.id === uahAccount.id)).toMatchObject({
      cards: [expect.objectContaining({ isActive: false })],
      isActive: false,
    })
    expect(
      after.find((item) => item.currency.numericCode === '978'),
    ).toMatchObject({ balanceMinor: 99_900, isActive: true })
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM transactions').get(),
    ).toEqual({ count: 1 })
    expect(
      sqlite.prepare('SELECT COUNT(*) AS count FROM sync_state').get(),
    ).toEqual({ count: 2 })
  })

  it('preserves an unrecognized ISO numeric currency without guessing a code', async () => {
    await repository.synchronize('owner-1', [
      account({
        providerAccountId: 'mono-future-currency',
        currencyNumericCode: '999',
      }),
    ])

    await expect(repository.listByUser('owner-1')).resolves.toEqual([
      expect.objectContaining({
        currency: {
          code: '999',
          displayName: 'ISO 4217 currency 999',
          minorUnit: 0,
          numericCode: '999',
        },
      }),
    ])
  })
})

describe('D1TransactionSyncRepository', () => {
  let sqlite: DatabaseSync
  let accounts: D1AccountsRepository
  let repository: D1TransactionSyncRepository

  beforeEach(async () => {
    sqlite = new DatabaseSync(':memory:')
    sqlite.exec('PRAGMA foreign_keys = ON')
    sqlite.exec(initialMigration)
    sqlite.exec(transactionSyncMigration)
    sqlite
      .prepare(`INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`)
      .run('owner-1', 'owner@example.com', 'not-a-real-hash')
    accounts = new D1AccountsRepository(asD1Database(sqlite))
    await accounts.synchronize('owner-1', [account({})])
    repository = new D1TransactionSyncRepository(asD1Database(sqlite))
  })

  it('imports each immutable provider transaction once and records duplicate skips', async () => {
    const claimed = await repository.claimNext('owner-1', 3_000_000, 1_000)
    expect(claimed).not.toBeNull()

    const first = await repository.importTransactions({
      accountId: claimed!.accountId,
      currencyCode: claimed!.currencyCode,
      transactions: [statementTransaction()],
      userId: 'owner-1',
    })
    const second = await repository.importTransactions({
      accountId: claimed!.accountId,
      currencyCode: claimed!.currencyCode,
      transactions: [statementTransaction()],
      userId: 'owner-1',
    })
    await repository.completeWindow({
      accountId: claimed!.accountId,
      backfillCursorAt: 1_000,
      lastSyncedTransactionAt: 2_000,
      nowEpochSeconds: 3_000_000,
    })

    expect(first).toEqual({ importedCount: 1, skippedDuplicateCount: 0 })
    expect(second).toEqual({ importedCount: 0, skippedDuplicateCount: 1 })
    expect(
      sqlite
        .prepare(
          `SELECT original_amount_minor, original_currency_code, original_description,
             original_mcc, original_timestamp, original_category_code,
             original_category_name, monobank_transaction_id
           FROM transactions`,
        )
        .get(),
    ).toEqual({
      monobank_transaction_id: 'mono-transaction-1',
      original_amount_minor: -500,
      original_currency_code: 'UAH',
      original_description: 'Coffee',
      original_mcc: 5732,
      original_timestamp: 2_000,
      original_category_code: '5732',
      original_category_name: 'Продаж електронного обладнання',
    })
    expect(
      sqlite
        .prepare(
          `SELECT status, last_successful_sync_at, last_synced_transaction_at
           FROM sync_state`,
        )
        .get(),
    ).toEqual({
      last_successful_sync_at: 3_000_000,
      last_synced_transaction_at: 2_000,
      status: 'idle',
    })
  })

  it('keeps the raw category fallback when importing an unknown MCC', async () => {
    const claimed = await repository.claimNext('owner-1', 3_000_000, 1_000)

    await repository.importTransactions({
      accountId: claimed!.accountId,
      currencyCode: claimed!.currencyCode,
      transactions: [statementTransaction({ mcc: 9998, originalMcc: 9998 })],
      userId: 'owner-1',
    })

    expect(
      sqlite
        .prepare(
          'SELECT original_category_code, original_category_name FROM transactions',
        )
        .get(),
    ).toEqual({
      original_category_code: '9998',
      original_category_name: 'MCC 9998',
    })
  })
})

function account(overrides: Partial<AccountSourceRecord>): AccountSourceRecord {
  return {
    accountType: 'black',
    balanceMinor: 125_050,
    creditLimitMinor: 50_000,
    currencyNumericCode: '980',
    maskedPans: [],
    providerAccountId: 'mono-account',
    ...overrides,
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

  async all<T>() {
    return {
      results: this.statement.all(...this.values) as T[],
      success: true,
    } as D1Result<T>
  }

  async first<T>() {
    return (this.statement.get(...this.values) as T | undefined) ?? null
  }

  run() {
    return this.executeRun()
  }

  async executeRun() {
    const result = this.statement.run(...this.values)
    return {
      meta: { changes: Number(result.changes) },
      results: [],
      success: true,
    } as unknown as D1Result<unknown>
  }
}

function statementTransaction(
  overrides: Partial<
    import('../worker/monobank/internal-dtos').TransactionSourceRecord
  > = {},
): import('../worker/monobank/internal-dtos').TransactionSourceRecord {
  return {
    accountAmountMinor: -500,
    balanceAfterMinor: 2_500,
    cashbackMinor: 0,
    commissionMinor: 0,
    description: 'Coffee',
    direction: 'expense',
    isHold: false,
    mcc: 5732,
    occurredAtEpochSeconds: 2_000,
    operationAmountMinor: -500,
    operationCurrencyNumericCode: '980',
    originalMcc: 5732,
    providerTransactionId: 'mono-transaction-1',
    ...overrides,
  }
}
