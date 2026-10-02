import { useQuery } from '@tanstack/react-query'
import { Alert, Skeleton } from '../../components/ui/Feedback'
import { Popover } from '../../components/ui/Popover'
import { Icon } from '../../components/ui/Icon'
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
                      ? 'Selected period has verified import coverage'
                      : coverage === 'partial'
                        ? 'Selected period has unverified gaps'
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
  return (
    <div className="data-freshness">
      <Popover
        label={t('Data freshness')}
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
                {t('Transaction sync status could not be loaded.')}
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
        <Icon name="sync" />
        <span>{t(online ? 'Data freshness' : 'Offline')}</span>
      </Popover>
      {partial || failed ? (
        <p role="status">
          {t(
            failed ? 'Sync needs retry' : 'Selected period has unverified gaps',
          )}
        </p>
      ) : null}
    </div>
  )
}
