import type { TransactionSyncState } from './transaction-sync-types'
import { transactionSyncLabel } from './transaction-sync-presentation'
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
                {`${state.accountType.charAt(0).toUpperCase()}${state.accountType.slice(1)} ${t('account')}`}{' '}
                · {state.currencyCode}
              </span>
              <strong className={`sync-state sync-state-${state.status}`}>
                {transactionSyncLabel(state, t, locale)}
              </strong>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
