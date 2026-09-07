export type TransactionDirection = 'income' | 'expense'

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

export interface TransactionListResult {
  nextCursor: string | null
  transactions: TransactionListItem[]
}

export interface TransactionListInput {
  accountIds: string[]
  category: string | null
  cursor: string | null
  currency: string | null
  dateFrom: number | null
  dateTo: number | null
  direction: TransactionDirection | null
  excluded: boolean | null
  limit: number
  search: string | null
  userId: string
}

export interface TransactionQueryRepository {
  list(input: TransactionListInput): Promise<TransactionListResult>
}

export class TransactionQueryService {
  private readonly repository: TransactionQueryRepository

  constructor(repository: TransactionQueryRepository) {
    this.repository = repository
  }

  list(input: TransactionListInput): Promise<TransactionListResult> {
    return this.repository.list(input)
  }
}
