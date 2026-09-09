import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import { beforeEach, describe, expect, it } from 'vitest'

import { MCC_CATEGORY_NAMES } from '../worker/monobank/mcc-categories'

const initialMigration = readFileSync(
  new URL('./0001_initial_schema.sql', import.meta.url),
  'utf8',
)
const migration = readFileSync(
  new URL('./0007_mcc_category_names.sql', import.meta.url),
  'utf8',
)

describe('MCC category name backfill migration', () => {
  let database: DatabaseSync

  beforeEach(() => {
    database = new DatabaseSync(':memory:')
    database.exec('PRAGMA foreign_keys = ON')
    database.exec(initialMigration)
    database.exec(`
      INSERT INTO users (id, email, password_hash)
      VALUES ('owner-1', 'owner@example.com', 'not-a-real-hash');
      INSERT INTO currencies (code, numeric_code, minor_unit, display_name)
      VALUES ('UAH', '980', 2, 'Ukrainian hryvnia');
      INSERT INTO accounts (
        id, user_id, monobank_account_id, type, currency_code
      ) VALUES ('account-1', 'owner-1', 'mono-account-1', 'black', 'UAH');
      INSERT INTO categories (id, user_id, name)
      VALUES ('category-custom', 'owner-1', 'My electronics');
    `)
  })

  it('backfills every category defined by the centralized runtime mapping', () => {
    for (const [mcc, categoryName] of Object.entries(MCC_CATEGORY_NAMES)) {
      const escapedCategoryName = categoryName.replaceAll("'", "''")
      expect(migration).toContain(`(${mcc}, '${escapedCategoryName}')`)
    }
  })

  it('updates only configured transactions that still have the raw MCC fallback', () => {
    insertTransaction(database, 'mapped', 5732, 'MCC 5732')
    insertTransaction(database, 'unknown', 9998, 'MCC 9998')
    insertTransaction(database, 'preserved', 5732, 'Existing category')

    database.exec(migration)

    expect(
      database
        .prepare(
          'SELECT id, original_category_name AS categoryName FROM transactions ORDER BY id',
        )
        .all(),
    ).toEqual([
      { categoryName: 'Продаж електронного обладнання', id: 'mapped' },
      { categoryName: 'Existing category', id: 'preserved' },
      { categoryName: 'MCC 9998', id: 'unknown' },
    ])
  })

  it('preserves manual category overrides and restores source immutability', () => {
    insertTransaction(database, 'mapped', 5732, 'MCC 5732')
    database
      .prepare(
        `INSERT INTO transaction_category_overrides (
           id, transaction_id, category_id, user_id
         ) VALUES (?, ?, ?, ?)`,
      )
      .run('override-1', 'mapped', 'category-custom', 'owner-1')

    database.exec(migration)

    expect(
      database
        .prepare(
          'SELECT category_id FROM transaction_category_overrides WHERE transaction_id = ?',
        )
        .get('mapped'),
    ).toEqual({ category_id: 'category-custom' })
    expect(() =>
      database
        .prepare(
          'UPDATE transactions SET original_category_name = ? WHERE id = ?',
        )
        .run('Changed', 'mapped'),
    ).toThrow('Imported transaction source fields are immutable')
  })
})

function insertTransaction(
  database: DatabaseSync,
  id: string,
  mcc: number,
  categoryName: string,
): void {
  database
    .prepare(
      `INSERT INTO transactions (
         id, user_id, account_id, monobank_transaction_id,
         original_amount_minor, original_currency_code, original_description,
         original_mcc, original_timestamp, original_category_code,
         original_category_name, direction
       ) VALUES (?, 'owner-1', 'account-1', ?, -100, 'UAH', 'Purchase', ?,
         1700000000, ?, ?, 'expense')`,
    )
    .run(id, `mono-${id}`, mcc, String(mcc), categoryName)
}
