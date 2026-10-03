import { FreshnessDetails } from '../transactions/DataFreshness'
import { useAccountsQuery } from '../accounts/account-queries'
import { useQuery } from '@tanstack/react-query'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { Popover } from '../../components/ui/Popover'
import { useOnlineState } from '../../lib/use-online-state'
import { useLocalization } from '../localization/localization'
import { getTransactionSyncStatus } from '../transactions/transaction-sync-api'
import { transactionQueryKeys } from '../transactions/transaction-queries'
import { SettingsRowContent } from './SettingsSections'

export function SettingsSyncStatus() {
  const { t } = useLocalization()
  const online = useOnlineState()
  const accounts = useAccountsQuery()
  const status = useQuery({
    queryFn: getTransactionSyncStatus,
    queryKey: transactionQueryKeys.syncStatus,
    staleTime: 30000,
  })
  return (
    <Popover
      className="settings-row-popover"
      label={t('Sync status')}
      mobileSheet
      content={
        <div className="settings-sync-details">
          <p>
            {t(
              'Transaction refreshes process one account window at a time. Older history may still be incomplete.',
            )}
          </p>
          {status.isPending || accounts.isPending ? (
            <Skeleton label={t('Loading transaction sync status…')} lines={2} />
          ) : null}
          {status.isError || accounts.isError ? (
            <Alert tone="danger">
              {t('Transaction sync status could not be loaded.')}
            </Alert>
          ) : null}
          {status.data?.length === 0 ? (
            <EmptyState title={t('No accounts ready for sync')}>
              <p>{t('Synchronize accounts before importing transactions.')}</p>
            </EmptyState>
          ) : null}
          {accounts.data === undefined ? null : (
            <FreshnessDetails
              accounts={accounts.data}
              states={status.data ?? []}
            />
          )}
          <Button
            variant="secondary"
            loading={status.isFetching || accounts.isFetching}
            disabled={!online}
            onClick={() =>
              void Promise.allSettled([status.refetch(), accounts.refetch()])
            }
          >
            {t(
              status.isFetching
                ? 'Refreshing status…'
                : status.isError
                  ? 'Retry'
                  : 'Refresh status',
            )}
          </Button>
        </div>
      }
    >
      <SettingsRowContent
        icon="sync"
        title={t('Sync status')}
        trailing={<Icon name="chevron" />}
      />
    </Popover>
  )
}
