import type { TransactionSyncState } from './transaction-sync-types'

interface TransactionSyncStatusProps {
  states: TransactionSyncState[] | null
}

export function TransactionSyncStatus({ states }: TransactionSyncStatusProps) {
  if (states === null) {
    return (
      <section className="transaction-sync-status" aria-live="polite">
        <p>Loading transaction sync status…</p>
      </section>
    )
  }

  return (
    <section
      className="transaction-sync-status"
      aria-labelledby="transaction-sync-status-title"
    >
      <div>
        <h2 id="transaction-sync-status-title">Transaction sync</h2>
        <p>
          Imported data stays in D1; refreshes run one safe account window at a
          time.
        </p>
      </div>
      {states.length === 0 ? (
        <p className="sync-status-empty">
          Synchronize accounts before importing transactions.
        </p>
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
    </section>
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
