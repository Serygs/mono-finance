import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '../../components/ui/Chips'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { Popover } from '../../components/ui/Popover'
import { useOnlineState } from '../../lib/use-online-state'
import { useLocalization } from '../localization/localization'
import { getTransactionSyncStatus } from '../transactions/transaction-sync-api'
import { transactionQueryKeys } from '../transactions/transaction-queries'
import {
  transactionSyncLabel,
  transactionSyncTone,
} from '../transactions/transaction-sync-presentation'
import { SettingsRowContent } from './SettingsSections'

export function SettingsSyncStatus() {
  const { locale, t } = useLocalization()
  const online = useOnlineState()
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
          {status.isPending ? (
            <Skeleton label={t('Loading transaction sync status…')} lines={2} />
          ) : null}
          {status.isError ? (
            <Alert tone="danger">
              {t('Transaction sync status could not be loaded.')}
            </Alert>
          ) : null}
          {status.data?.length === 0 ? (
            <EmptyState title={t('No accounts ready for sync')}>
              <p>{t('Synchronize accounts before importing transactions.')}</p>
            </EmptyState>
          ) : null}
          {status.data === undefined ? null : (
            <ul className="settings-sync-details__list">
              {status.data.map((state) => (
                <li key={state.accountId}>
                  <span>
                    {state.accountType} · {state.currencyCode}
                  </span>
                  <StatusBadge
                    label={transactionSyncLabel(state, t, locale)}
                    tone={transactionSyncTone(state)}
                  />
                </li>
              ))}
            </ul>
          )}
          <Button
            variant="secondary"
            loading={status.isFetching}
            disabled={!online}
            onClick={() => void status.refetch()}
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
