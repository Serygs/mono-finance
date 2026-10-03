import type { Translate } from '../localization/localization'
import type { TransactionSyncState } from './transaction-sync-types'

export function transactionSyncLabel(
  state: TransactionSyncState,
  t: Translate,
  locale: string,
) {
  if (state.status === 'running') return t('Sync in progress')
  if (state.status === 'failed') return t('Sync needs retry')
  if (state.lastSuccessfulSyncAt === null) return t('Not synced yet')
  return t('Transaction sync succeeded {date}', {
    date: new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(state.lastSuccessfulSyncAt * 1000),
  })
}

export function transactionSyncTone(
  state: TransactionSyncState,
): 'danger' | 'neutral' | 'success' {
  if (state.status === 'failed') return 'danger'
  return state.status === 'running' || state.lastSuccessfulSyncAt === null
    ? 'neutral'
    : 'success'
}
