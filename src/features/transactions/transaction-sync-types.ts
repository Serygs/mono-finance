export interface TransactionSyncState {
  accountId: string
  accountType: string
  currencyCode: string
  lastErrorCode: string | null
  lastSuccessfulSyncAt: number | null
  status: 'idle' | 'running' | 'failed'
}

export interface TransactionSyncResult {
  accountId: string | null
  importedCount: number
  skippedDuplicateCount: number
  status: 'completed' | 'no_accounts' | 'synchronized'
  window: { fromEpochSeconds: number; toEpochSeconds: number } | null
}
