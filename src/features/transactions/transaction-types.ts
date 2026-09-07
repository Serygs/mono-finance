export type TransactionDirection = 'income' | 'expense'

export interface TransactionListFilters {
  accountIds: string[]
  category: string | null
  currency: string | null
  dateFrom: number | null
  dateTo: number | null
  direction: TransactionDirection | null
  excluded: boolean | null
  search: string | null
}

export interface TransactionListItem {
  account: {
    id: string
    maskedPan: string | null
    type: string
  }
  category: {
    id: string | null
    name: string | null
    source: 'custom' | 'original' | null
  }
  currencyCode: string
  currencyMinorUnit: number
  effectiveAmountMinor: number
  adjustmentNote: string | null
  hasAdjustment: boolean
  hasCompensation: boolean
  id: string
  isExcluded: boolean
  exclusionReason: string | null
  originalAmountMinor: number
  originalDescription: string
  originalMcc: number | null
  originalTimestamp: number
}

export interface TransactionPage {
  nextCursor: string | null
  transactions: TransactionListItem[]
}

export interface TransactionCorrection {
  effectiveAmountMinor: number
  hasAdjustment: boolean
  id: string
  isExcluded: boolean
}
