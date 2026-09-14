import { useQuery } from '@tanstack/react-query'

import { StatusBadge } from '../../components/ui/Chips'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Popover } from '../../components/ui/Popover'
import { useLocalization, type Translate } from '../localization/localization'
import { getTransactionSyncStatus } from '../transactions/transaction-sync-api'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'
import { SettingsRowContent } from './SettingsSections'

export function SettingsSyncStatus() {
  const { locale, t } = useLocalization()
  const status = useQuery({
    queryFn: getTransactionSyncStatus,
    queryKey: ['transaction-sync-status'],
    staleTime: 30_000,
  })

  return (
    <Popover
      className="settings-row-popover"
      content={
        status.isPending ? (
          <Skeleton label={t('Loading transaction sync status…')} lines={2} />
        ) : status.isError ? (
          <Alert tone="danger">
            {t('Transaction sync status could not be loaded.')}
          </Alert>
        ) : status.data?.length === 0 ? (
          <EmptyState title={t('No accounts ready for sync')}>
            <p>{t('Synchronize accounts before importing transactions.')}</p>
          </EmptyState>
        ) : (
          <div className="settings-sync-details">
            <p>
              {t(
                'Imported data stays in D1; refreshes run one safe account window at a time.',
              )}
            </p>
            <ul className="settings-sync-details__list">
              {status.data?.map((state) => (
                <li key={state.accountId}>
                  <span>
                    {accountLabel(state, t)} · {state.currencyCode}
                  </span>
                  <StatusBadge
                    label={statusLabel(state, t, locale)}
                    tone={statusTone(state)}
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      }
      label={t('Sync status')}
    >
      <SettingsRowContent
        icon="↻"
        subtitle={t('Review imported transaction sync status.')}
        title={t('Sync status')}
        trailing={
          <span aria-hidden="true" className="settings-row__chevron">
            ›
          </span>
        }
      />
    </Popover>
  )
}

function accountLabel(state: TransactionSyncState, t: Translate): string {
  return `${state.accountType.charAt(0).toUpperCase()}${state.accountType.slice(1)} ${t('account')}`
}

function statusLabel(
  state: TransactionSyncState,
  t: Translate,
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

function statusTone(
  state: TransactionSyncState,
): 'danger' | 'neutral' | 'success' {
  if (state.status === 'failed') return 'danger'
  if (state.status === 'running' || state.lastSuccessfulSyncAt === null)
    return 'neutral'
  return 'success'
}
