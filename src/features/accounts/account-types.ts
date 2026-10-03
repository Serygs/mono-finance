export interface AccountCardSummary {
  id: string
  isActive: boolean
  maskedPan: string
}

export interface AccountSummary {
  /** Confirmed account snapshot persisted at this UTC epoch second; absent/null for legacy data. */
  balanceUpdatedAt?: number | null
  balanceMinor: number
  cards: AccountCardSummary[]
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
