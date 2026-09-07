import type { MonobankClient } from '../monobank/client'
import type { AccountSourceRecord } from '../monobank/internal-dtos'

export interface AccountCardView {
  id: string
  isActive: boolean
  maskedPan: string
}

export interface AccountView {
  balanceMinor: number
  cards: AccountCardView[]
  creditLimitMinor: number | null
  currency: {
    code: string
    displayName: string
    minorUnit: number
    numericCode: string
  }
  id: string
  isActive: boolean
  type: string
}

export interface AccountRepository {
  listByUser(userId: string): Promise<AccountView[]>
  synchronize(userId: string, accounts: AccountSourceRecord[]): Promise<void>
}

export class AccountService {
  private readonly repository: AccountRepository
  private readonly monobankClient: MonobankClient

  constructor(repository: AccountRepository, monobankClient: MonobankClient) {
    this.repository = repository
    this.monobankClient = monobankClient
  }

  list(userId: string): Promise<AccountView[]> {
    return this.repository.listByUser(userId)
  }

  async synchronize(userId: string): Promise<AccountView[]> {
    const snapshot = await this.monobankClient.getClientInfo()
    await this.repository.synchronize(userId, snapshot.accounts)
    return this.repository.listByUser(userId)
  }
}
