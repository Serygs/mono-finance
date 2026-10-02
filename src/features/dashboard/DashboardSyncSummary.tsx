import { Skeleton } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'
import { transactionSyncLabel } from '../transactions/transaction-sync-presentation'

export function DashboardSyncSummary({
  states,
}: {
  states: TransactionSyncState[] | null
}) {
  const { t, locale } = useLocalization()
  return states === null ? (
    <Skeleton label={t('Loading transaction sync status…')} lines={2} />
  ) : (
    <ul className="sync-status-list">
      {states.map((item) => (
        <li key={item.accountId}>
          <span>
            {item.accountType} · {item.currencyCode}
          </span>
          <strong className={`sync-state sync-state-${item.status}`}>
            {transactionSyncLabel(item, t, locale)}
          </strong>
        </li>
      ))}
    </ul>
  )
}
