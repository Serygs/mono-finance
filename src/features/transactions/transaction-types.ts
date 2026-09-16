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
    colorToken: string | null
    id: string | null
    icon: string | null
    name: string | null
    source: 'custom' | 'mapped' | 'original' | null
  }
  originalCategory: {
    id: string | null
    name: string | null
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

export interface CompensationDetails {
  links: CompensationLink[]
  suggestions: CompensationSuggestion[]
  summary: {
    compensatedAmountMinor: number
    currencyCode: string
    originalExpenseAmountMinor: number
    remainingPersonalExpenseMinor: number
  }
}
export interface CompensationLink {
  compensatedAmountMinor: number
  compensationTransactionId: string
  description: string
  id: string
  originalTimestamp: number
}
export interface CompensationSuggestion {
  availableAmountMinor: number
  confidenceScore: number
  description: string
  originalAmountMinor: number
  originalTimestamp: number
  transactionId: string
}
