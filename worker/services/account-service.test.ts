import { describe, expect, it } from 'vitest'

import type { MonobankClient } from '../monobank/client'
import type { AccountSourceRecord } from '../monobank/internal-dtos'
import {
  AccountService,
  type AccountRepository,
  type AccountView,
} from './account-service'

const sourceAccounts: AccountSourceRecord[] = [
  {
    providerAccountId: 'mono-uah',
    accountType: 'black',
    balanceMinor: 125_050,
    creditLimitMinor: 50_000,
    currencyNumericCode: '980',
    maskedPans: ['537541******1234'],
  },
  {
    providerAccountId: 'mono-gbp',
    accountType: 'white',
    balanceMinor: 7_500,
    creditLimitMinor: 0,
    currencyNumericCode: '826',
    maskedPans: [],
  },
]

const storedAccounts: AccountView[] = [
  {
    balanceMinor: 125_050,
    cards: [
      {
        id: 'card-1',
        isActive: true,
        maskedPan: '537541******1234',
      },
    ],
    creditLimitMinor: 50_000,
    currency: {
      code: 'UAH',
      displayName: 'Ukrainian Hryvnia',
      minorUnit: 2,
      numericCode: '980',
    },
    id: 'account-1',
    isActive: true,
    type: 'black',
  },
]

describe('AccountService', () => {
  it('fetches every provider account, persists it for the owner, and returns the safe list', async () => {
    const repository = new FakeAccountRepository(storedAccounts)
    const service = new AccountService(
      repository,
      new FakeMonobankClient(sourceAccounts),
    )

    const result = await service.synchronize('owner-1')

    expect(repository.synchronized).toEqual({
      accounts: sourceAccounts,
      userId: 'owner-1',
    })
    expect(result).toEqual(storedAccounts)
  })

  it('lists persisted accounts without calling Monobank', async () => {
    const client = new FakeMonobankClient(sourceAccounts)
    const service = new AccountService(
      new FakeAccountRepository(storedAccounts),
      client,
    )

    await expect(service.list('owner-1')).resolves.toEqual(storedAccounts)
    expect(client.clientInfoRequests).toBe(0)
  })
})

class FakeMonobankClient implements MonobankClient {
  clientInfoRequests = 0
  private readonly accounts: AccountSourceRecord[]

  constructor(accounts: AccountSourceRecord[]) {
    this.accounts = accounts
  }

  async getClientInfo() {
    this.clientInfoRequests += 1
    return {
      accounts: this.accounts,
      displayName: 'Owner',
      providerClientId: 'mono-client',
    }
  }

  async getStatement() {
    return []
  }
}

class FakeAccountRepository implements AccountRepository {
  synchronized: { accounts: AccountSourceRecord[]; userId: string } | null =
    null

  private readonly accounts: AccountView[]

  constructor(accounts: AccountView[]) {
    this.accounts = accounts
  }

  async listByUser() {
    return this.accounts
  }

  async synchronize(userId: string, accounts: AccountSourceRecord[]) {
    this.synchronized = { accounts, userId }
  }
}
