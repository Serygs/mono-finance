import type { TransactionSyncState } from './transaction-sync-types'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Card } from '../../components/ui/Surfaces'
import { useLocalization } from '../localization/localization'

interface TransactionSyncStatusProps {
  states: TransactionSyncState[] | null
}

export function TransactionSyncStatus({ states }: TransactionSyncStatusProps) {
  const { t, locale } = useLocalization()
  if (states === null) {
    return <Skeleton label={t('Loading transaction sync status…')} lines={2} />
  }

  return (
    <Card className="transaction-sync-status" title={t('Transaction sync')}>
      <p>
        {t(
          'Imported data stays in D1; refreshes run one safe account window at a time.',
        )}
      </p>
      {states.length === 0 ? (
        <EmptyState title={t('No accounts ready for sync')}>
          <p>{t('Synchronize accounts before importing transactions.')}</p>
        </EmptyState>
      ) : (
        <ul className="sync-status-list">
          {states.map((state) => (
            <li key={state.accountId}>
              <span>
                {accountLabel(state)} · {state.currencyCode}
              </span>
              <strong className={`sync-state sync-state-${state.status}`}>
                {statusLabel(state, t, locale)}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function accountLabel(state: TransactionSyncState): string {
  return `${state.accountType.charAt(0).toUpperCase()}${state.accountType.slice(1)} account`
}

function statusLabel(
  state: TransactionSyncState,
  t: (
    key: string,
    parameters?: Readonly<Record<string, string | number>>,
  ) => string,
  locale: string,
): string {
  if (state.status === 'running') return t('Sync in progress')
  if (state.status === 'failed') return t('Sync needs retry')
  if (state.lastSuccessfulSyncAt === null) return t('Not synced yet')
  return t('Last synced {date}', {
    date: new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(state.lastSuccessfulSyncAt * 1_000),
  })
}
