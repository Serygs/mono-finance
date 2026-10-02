import { FreshnessDetails } from '../transactions/DataFreshness'
import { useAccountsQuery } from '../accounts/account-queries'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'

export function DashboardSyncSummary({
  states,
}: {
  states: TransactionSyncState[] | null
}) {
  const { t } = useLocalization()
  const accounts = useAccountsQuery()
  return states === null || accounts.isPending ? (
    <Skeleton label={t('Loading transaction sync status…')} lines={2} />
  ) : accounts.data === undefined ? (
    <Alert tone="warning">
      {t('Transaction sync status could not be loaded.')}
    </Alert>
  ) : (
    <FreshnessDetails accounts={accounts.data} states={states} />
  )
}
