import { Skeleton } from '../../../components/ui/Feedback'
import { useLocalization } from '../../localization/localization'
import type { TransactionListItem } from '../../transactions/transaction-types'
import { RecentTransactionRow } from '../../transactions/TransactionRow'
import { DashboardEmptyState } from '../DashboardEmptyState'
import type { CustomCategory } from '../../categories/categories-api'
import { resolveRecentTransactionVisual } from '../../transactions/transaction-visual'

export function RecentTransactionsWidget({
  limit,
  loading,
  filtered,
  transactions,
  units,
  onSelect,
  customCategories,
}: {
  limit: 5 | 10 | 20
  filtered: boolean
  loading: boolean
  transactions: TransactionListItem[]
  onSelect(transaction: TransactionListItem): void
  units: Map<string, number>
  customCategories: CustomCategory[]
}) {
  const { t } = useLocalization()
  return (
    <>
      {loading ? (
        <Skeleton label={t('Loading transactions…')} lines={3} />
      ) : transactions.length === 0 ? (
        <DashboardEmptyState
          message={
            filtered
              ? 'No transactions match these filters.'
              : 'No transactions in this period.'
          }
        />
      ) : (
        <ol className="recent-transactions-list">
          {transactions.slice(0, limit).map((item) => (
            <RecentTransactionRow
              key={item.id}
              transaction={item}
              minorUnit={units.get(item.currencyCode) ?? item.currencyMinorUnit}
              onSelect={onSelect}
              visual={resolveRecentTransactionVisual(item, customCategories)}
            />
          ))}
        </ol>
      )}
    </>
  )
}
