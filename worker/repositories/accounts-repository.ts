import { resolveCurrency, type CurrencyDefinition } from '../common/currencies'
import type { AccountSourceRecord } from '../monobank/internal-dtos'
import type {
  AccountRepository,
  AccountView,
} from '../services/account-service'

interface ExistingAccountRow {
  id: string
  monobank_account_id: string
}

interface ExistingCardRow {
  account_id: string
  id: string
  masked_pan: string
}

interface AccountListRow {
  account_id: string
  account_type: string
  balance_minor: number
  card_id: string | null
  card_is_active: number | null
  credit_limit_minor: number | null
  currency_code: string
  currency_display_name: string
  currency_minor_unit: number
  currency_numeric_code: string
  is_active: number
  masked_pan: string | null
}

export class D1AccountsRepository implements AccountRepository {
  private readonly database: D1Database
  private readonly now: () => number

  constructor(
    database: D1Database,
    now: () => number = () => Math.floor(Date.now() / 1_000),
  ) {
    this.database = database
    this.now = now
  }

  async synchronize(
    userId: string,
    sourceAccounts: AccountSourceRecord[],
  ): Promise<void> {
    const accounts = uniqueAccounts(sourceAccounts)
    const [existingAccountsResult, existingCardsResult] = await Promise.all([
      this.database
        .prepare(
          `SELECT id, monobank_account_id
           FROM accounts
           WHERE user_id = ?`,
        )
        .bind(userId)
        .all<ExistingAccountRow>(),
      this.database
        .prepare(
          `SELECT account_cards.id, account_cards.account_id, account_cards.masked_pan
           FROM account_cards
           INNER JOIN accounts ON accounts.id = account_cards.account_id
           WHERE accounts.user_id = ?`,
        )
        .bind(userId)
        .all<ExistingCardRow>(),
    ])
    const accountIds = new Map(
      existingAccountsResult.results.map((row) => [
        row.monobank_account_id,
        row.id,
      ]),
    )
    const cardIds = new Map(
      existingCardsResult.results.map((row) => [
        cardKey(row.account_id, row.masked_pan),
        row.id,
      ]),
    )
    const timestamp = this.now()
    const currencies = uniqueCurrencies(accounts)
    const statements: D1PreparedStatement[] = [
      this.database
        .prepare(
          `UPDATE account_cards
           SET is_active = 0, updated_at = ?
           WHERE account_id IN (SELECT id FROM accounts WHERE user_id = ?)`,
        )
        .bind(timestamp, userId),
      this.database
        .prepare(
          `UPDATE accounts
           SET is_active = 0, updated_at = ?
           WHERE user_id = ?`,
        )
        .bind(timestamp, userId),
    ]

    for (const currency of currencies) {
      statements.push(this.upsertCurrency(currency, timestamp))
    }

    for (const account of accounts) {
      const accountId =
        accountIds.get(account.providerAccountId) ?? crypto.randomUUID()
      accountIds.set(account.providerAccountId, accountId)
      const currency = resolveCurrency(account.currencyNumericCode)
      statements.push(
        this.database
          .prepare(
            `INSERT INTO accounts (
               id, user_id, monobank_account_id, type, currency_code,
               balance_minor, credit_limit_minor, is_active, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
             ON CONFLICT(monobank_account_id) DO UPDATE SET
               type = excluded.type,
               currency_code = excluded.currency_code,
               balance_minor = excluded.balance_minor,
               credit_limit_minor = excluded.credit_limit_minor,
               is_active = 1,
               updated_at = excluded.updated_at`,
          )
          .bind(
            accountId,
            userId,
            account.providerAccountId,
            account.accountType,
            currency.code,
            account.balanceMinor,
            account.creditLimitMinor,
            timestamp,
            timestamp,
          ),
      )
      statements.push(
        this.database
          .prepare(
            `INSERT INTO sync_state (
               id, account_id, status, created_at, updated_at
             ) VALUES (?, ?, 'idle', ?, ?)
             ON CONFLICT(account_id) DO NOTHING`,
          )
          .bind(crypto.randomUUID(), accountId, timestamp, timestamp),
      )

      for (const maskedPan of new Set(account.maskedPans)) {
        const key = cardKey(accountId, maskedPan)
        const cardId = cardIds.get(key) ?? crypto.randomUUID()
        cardIds.set(key, cardId)
        statements.push(
          this.database
            .prepare(
              `INSERT INTO account_cards (
                 id, account_id, masked_pan, is_active, created_at, updated_at
               ) VALUES (?, ?, ?, 1, ?, ?)
               ON CONFLICT(account_id, masked_pan) DO UPDATE SET
                 is_active = 1,
                 updated_at = excluded.updated_at`,
            )
            .bind(cardId, accountId, maskedPan, timestamp, timestamp),
        )
      }
    }

    await this.database.batch(statements)
  }

  async listByUser(userId: string): Promise<AccountView[]> {
    const result = await this.database
      .prepare(
        `SELECT
           accounts.id AS account_id,
           accounts.type AS account_type,
           accounts.balance_minor,
           accounts.credit_limit_minor,
           accounts.is_active,
           currencies.code AS currency_code,
           currencies.numeric_code AS currency_numeric_code,
           currencies.minor_unit AS currency_minor_unit,
           currencies.display_name AS currency_display_name,
           account_cards.id AS card_id,
           account_cards.masked_pan,
           account_cards.is_active AS card_is_active
         FROM accounts
         INNER JOIN currencies ON currencies.code = accounts.currency_code
         LEFT JOIN account_cards ON account_cards.account_id = accounts.id
         WHERE accounts.user_id = ?
         ORDER BY accounts.is_active DESC, accounts.created_at, accounts.id,
           account_cards.is_active DESC, account_cards.created_at, account_cards.id`,
      )
      .bind(userId)
      .all<AccountListRow>()

    return mapAccountRows(result.results)
  }

  private upsertCurrency(
    currency: CurrencyDefinition,
    timestamp: number,
  ): D1PreparedStatement {
    return this.database
      .prepare(
        `INSERT INTO currencies (
           code, numeric_code, minor_unit, display_name, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET
           numeric_code = excluded.numeric_code,
           minor_unit = excluded.minor_unit,
           display_name = excluded.display_name,
           updated_at = excluded.updated_at`,
      )
      .bind(
        currency.code,
        currency.numericCode,
        currency.minorUnit,
        currency.displayName,
        timestamp,
        timestamp,
      )
  }
}

function uniqueAccounts(
  accounts: AccountSourceRecord[],
): AccountSourceRecord[] {
  return [
    ...new Map(
      accounts.map((account) => [account.providerAccountId, account]),
    ).values(),
  ]
}

function uniqueCurrencies(
  accounts: AccountSourceRecord[],
): CurrencyDefinition[] {
  return [
    ...new Map(
      accounts.map((account) => {
        const currency = resolveCurrency(account.currencyNumericCode)
        return [currency.code, currency]
      }),
    ).values(),
  ]
}

function cardKey(accountId: string, maskedPan: string): string {
  return `${accountId}\u0000${maskedPan}`
}

function mapAccountRows(rows: AccountListRow[]): AccountView[] {
  const accounts = new Map<string, AccountView>()

  for (const row of rows) {
    let account = accounts.get(row.account_id)
    if (account === undefined) {
      account = {
        balanceMinor: row.balance_minor,
        cards: [],
        creditLimitMinor: row.credit_limit_minor,
        currency: {
          code: row.currency_code,
          displayName: row.currency_display_name,
          minorUnit: row.currency_minor_unit,
          numericCode: row.currency_numeric_code,
        },
        id: row.account_id,
        isActive: row.is_active === 1,
        type: row.account_type,
      }
      accounts.set(account.id, account)
    }

    if (
      row.card_id !== null &&
      row.card_is_active !== null &&
      row.masked_pan !== null
    ) {
      account.cards.push({
        id: row.card_id,
        isActive: row.card_is_active === 1,
        maskedPan: row.masked_pan,
      })
    }
  }

  return [...accounts.values()]
}
