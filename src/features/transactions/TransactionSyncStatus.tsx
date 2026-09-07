import type { TransactionSyncState } from './transaction-sync-types'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Card } from '../../components/ui/Surfaces'

interface TransactionSyncStatusProps {
  states: TransactionSyncState[] | null
}

export function TransactionSyncStatus({ states }: TransactionSyncStatusProps) {
  if (states === null) {
    return <Skeleton label="Loading transaction sync status…" lines={2} />
  }

  return (
    <Card className="transaction-sync-status" title="Transaction sync">
      <p>
        Imported data stays in D1; refreshes run one safe account window at a
        time.
      </p>
      {states.length === 0 ? (
        <EmptyState title="No accounts ready for sync">
          <p>Synchronize accounts before importing transactions.</p>
        </EmptyState>
      ) : (
        <ul className="sync-status-list">
          {states.map((state) => (
            <li key={state.accountId}>
              <span>
                {accountLabel(state)} · {state.currencyCode}
              </span>
              <strong className={`sync-state sync-state-${state.status}`}>
                {statusLabel(state)}
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

function statusLabel(state: TransactionSyncState): string {
  if (state.status === 'running') return 'Sync in progress'
  if (state.status === 'failed') return 'Sync needs retry'
  if (state.lastSuccessfulSyncAt === null) return 'Not synced yet'
  return `Last synced ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(state.lastSuccessfulSyncAt * 1_000)}`
}
