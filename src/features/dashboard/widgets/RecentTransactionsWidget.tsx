import { Skeleton } from '../../../components/ui/Feedback'
import { useLocalization } from '../../localization/localization'
import type { TransactionListItem } from '../../transactions/transaction-types'
import { RecentTransactionRow } from '../../transactions/TransactionRow'
import { DashboardEmptyState } from '../DashboardEmptyState'

export function RecentTransactionsWidget({
  limit,
  loading,
  transactions,
  units,
  onSelect,
}: {
  limit: 5 | 10 | 20
  loading: boolean
  transactions: TransactionListItem[]
  onSelect(transaction: TransactionListItem): void
  units: Map<string, number>
}) {
  const { t } = useLocalization()
  return (
    <>
      {loading ? (
        <Skeleton label={t('Loading transactions…')} lines={3} />
      ) : transactions.length === 0 ? (
        <DashboardEmptyState message="No transactions in this view" />
      ) : (
        <ol className="recent-transactions-list">
          {transactions.slice(0, limit).map((item) => (
            <RecentTransactionRow
              key={item.id}
              transaction={item}
              minorUnit={units.get(item.currencyCode) ?? item.currencyMinorUnit}
              onSelect={onSelect}
            />
          ))}
        </ol>
      )}
    </>
  )
}
