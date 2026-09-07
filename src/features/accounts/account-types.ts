export interface AccountCardSummary {
  id: string
  isActive: boolean
  maskedPan: string
}

export interface AccountSummary {
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
