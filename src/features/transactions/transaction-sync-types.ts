export interface TransactionSyncState {
  accountId: string
  accountType: string
  currencyCode: string
  lastErrorCode: string | null
  lastSuccessfulSyncAt: number | null
  status: 'idle' | 'running' | 'failed'
}

export interface TransactionSyncResult {
  accountIds: string[]
  importedCount: number
  skippedDuplicateCount: number
  status: 'no_accounts' | 'synchronized'
}
