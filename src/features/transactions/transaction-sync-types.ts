export interface TransactionSyncState {
  accountId: string
  accountType: string
  currencyCode: string
  lastErrorCode: string | null
  /** Fully persisted successful statement request intervals; absent/null means unknown legacy coverage. */
  coverageIntervals?: Array<{
    fromEpochSeconds: number
    toEpochSeconds: number
    completedAt: number
  }> | null
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
