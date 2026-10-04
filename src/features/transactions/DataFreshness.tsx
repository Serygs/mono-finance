import { useQuery } from '@tanstack/react-query'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { Popover } from '../../components/ui/Popover'
import { Icon } from '../../components/ui/Icon'
import { Button } from '../../components/ui/Controls'
import { useOnlineState } from '../../lib/use-online-state'
import { useLocalization } from '../localization/localization'
import { useAccountsQuery } from '../accounts/account-queries'
import { accountName } from '../accounts/account-formatting'
import { getTransactionSyncStatus } from './transaction-sync-api'
import { transactionQueryKeys } from './transaction-queries'
import type { AccountSummary } from '../accounts/account-types'
import type { TransactionSyncState } from './transaction-sync-types'
import { transactionSyncLabel } from './transaction-sync-presentation'
import { periodCoverage } from './data-freshness'

export function FreshnessDetails({
  accounts,
  states,
  range = null,
}: {
  accounts: AccountSummary[]
  states: TransactionSyncState[]
  range?: { dateFrom: number; dateTo: number } | null
}) {
  const { locale, t } = useLocalization()
  const online = useOnlineState()
  const date = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(value * 1000)
  return (
    <div className="data-freshness-details">
      <p>
        {t(online ? 'Online' : 'Offline')} ·{' '}
        {t('Transaction import time does not describe balance freshness.')}
      </p>
      <p>
        {t(
          'Coverage records successful statement windows, not the first or last transaction. Unverified gaps remain unknown.',
        )}
      </p>
      <p>
        {t(
          'Coverage is checked only through the current time. Future intervals are not gaps.',
        )}
      </p>
      {accounts.length === 0 ? (
        <p>{t('No accounts ready for sync')}</p>
      ) : (
        <ul className="settings-sync-details__list">
          {accounts.map((account) => {
            const state = states.find((item) => item.accountId === account.id)
            const coverage = periodCoverage(state?.coverageIntervals, range)
            return (
              <li key={account.id}>
                <strong>
                  {accountName(account.type, t('Account'))} ·{' '}
                  {account.currency.code}
                </strong>
                <span>{t(account.isActive ? 'Active' : 'Unavailable')}</span>
                <span>
                  {account.balanceUpdatedAt == null
                    ? t('Balance update time unknown')
                    : t('Balance updated {date}', {
                        date: date(account.balanceUpdatedAt),
                      })}
                </span>
                <span>
                  {state === undefined
                    ? t('Transaction import time unknown')
                    : transactionSyncLabel(state, t, locale)}
                </span>
                {state?.status !== 'idle' &&
                state?.lastSuccessfulSyncAt != null ? (
                  <span>
                    {transactionSyncLabel(
                      { ...state, status: 'idle' },
                      t,
                      locale,
                    )}
                  </span>
                ) : null}
                {!state?.coverageIntervals?.length ? (
                  <span>{t('Verified transaction import time unknown')}</span>
                ) : null}
                <span>
                  {t(
                    coverage === 'covered'
                      ? 'Elapsed portion has verified import coverage'
                      : coverage === 'partial'
                        ? 'Elapsed portion has unverified gaps'
                        : coverage === 'future'
                          ? 'Selected period is in the future'
                          : 'History coverage unknown',
                  )}
                </span>
                {state?.coverageIntervals?.length ? (
                  <details>
                    <summary>{t('Verified import windows')}</summary>
                    <ul>
                      {state.coverageIntervals.map((window) => (
                        <li
                          key={`${window.fromEpochSeconds}:${window.toEpochSeconds}`}
                        >
                          <span>
                            {date(window.fromEpochSeconds)} –{' '}
                            {date(window.toEpochSeconds)}
                          </span>
                          <span>
                            {t('Imported successfully {date}', {
                              date: date(window.completedAt),
                            })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
      <p>
        {t(
          'Accounts with the same type and currency may look identical when card numbers are unavailable.',
        )}
      </p>
    </div>
  )
}

export function DataFreshness({
  accountIds,
  range,
}: {
  accountIds: string[]
  range: { dateFrom: number; dateTo: number } | null
}) {
  const { t } = useLocalization()
  const online = useOnlineState()
  const accounts = useAccountsQuery()
  const status = useQuery({
    queryKey: transactionQueryKeys.syncStatus,
    queryFn: getTransactionSyncStatus,
    staleTime: 30000,
  })
  const selected = (accounts.data ?? []).filter(
    (item) => accountIds.length === 0 || accountIds.includes(item.id),
  )
  const partial = selected.some(
    (account) =>
      periodCoverage(
        status.data?.find((state) => state.accountId === account.id)
          ?.coverageIntervals,
        range,
      ) === 'partial',
  )
  const failed =
    status.data?.some(
      (state) =>
        (accountIds.length === 0 || accountIds.includes(state.accountId)) &&
        state.status === 'failed',
    ) ?? false
  const unavailable = status.isError || accounts.isError
  const warning = failed || partial || unavailable
  const summary = unavailable
    ? t('Status unavailable')
    : failed
      ? t('Sync needs retry')
      : partial
        ? t('Import gaps')
        : t(online ? 'Data freshness' : 'Offline')
  const warningDescription = unavailable
    ? t('Transaction sync status could not be loaded.')
    : failed
      ? t('Sync needs retry')
      : partial
        ? t('Elapsed portion has unverified gaps')
        : undefined
  return (
    <div
      className={`data-freshness${warning ? ' data-freshness--warning' : ''}`}
    >
      <Popover
        label={t('Data freshness')}
        description={warningDescription ?? t(online ? 'Online' : 'Offline')}
        mobileSheet
        content={
          <>
            {status.isPending || accounts.isPending ? (
              <Skeleton
                label={t('Loading transaction sync status…')}
                lines={2}
              />
            ) : null}
            {status.isError || accounts.isError ? (
              <Alert tone="warning">
                <p>{t('Transaction sync status could not be loaded.')}</p>
                <Button
                  variant="secondary"
                  loading={status.isFetching || accounts.isFetching}
                  onClick={() => {
                    if (status.isError) void status.refetch()
                    if (accounts.isError) void accounts.refetch()
                  }}
                >
                  {t('Retry')}
                </Button>
              </Alert>
            ) : null}
            {failed || partial ? (
              <Alert tone="warning">
                {t(
                  failed
                    ? 'Sync needs retry'
                    : 'Elapsed portion has unverified gaps',
                )}
              </Alert>
            ) : null}
            {accounts.data === undefined ? null : (
              <FreshnessDetails
                accounts={selected}
                states={status.data ?? []}
                range={range}
              />
            )}
          </>
        }
      >
        <Icon name={warning ? 'info' : 'sync'} />
        <span>{summary}</span>
      </Popover>
      {warningDescription !== undefined ? (
        <span className="sr-only" role="status">
          {warningDescription}
        </span>
      ) : null}
    </div>
  )
}
