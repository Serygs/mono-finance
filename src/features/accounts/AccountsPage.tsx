import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { StatusBadge } from '../../components/ui/Chips'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { Card, InfoTooltip } from '../../components/ui/Surfaces'
import { useLocalization } from '../localization/localization'
import { formatAccountBalance } from './account-formatting'
import { getAccounts, synchronizeAccounts } from './accounts-api'
import { summarizeCurrencyBalances } from './account-summary'
import type { AccountSummary } from './account-types'

export function AccountsPage() {
  const { t } = useLocalization()
  const client = useQueryClient()
  const accounts = useQuery({
    queryFn: getAccounts,
    queryKey: ['accounts'],
  })
  const synchronize = useMutation({
    mutationFn: synchronizeAccounts,
    onSuccess: (nextAccounts) => {
      client.setQueryData(['accounts'], nextAccounts)
    },
  })
  const balances = useMemo(
    () => summarizeCurrencyBalances(accounts.data ?? []),
    [accounts.data],
  )

  return (
    <PageSurface className="accounts-page accounts-page--summary">
      <PageHeader
        actions={
          <Button
            loading={synchronize.isPending}
            onClick={() => synchronize.mutate()}
            type="button"
          >
            {t('Sync accounts')}
          </Button>
        }
        description={
          <p>{t('Your synchronized balances, by account and currency.')}</p>
        }
        id="accounts-title"
        title={t('Accounts')}
      />
      {accounts.isPending ? (
        <Skeleton label={t('Loading accounts…')} lines={5} />
      ) : null}
      {accounts.isError ? (
        <Alert
          tone="danger"
          title={t('Accounts could not be loaded. Try again later.')}
        >
          <Button
            onClick={() => void accounts.refetch()}
            size="small"
            type="button"
          >
            {t('Retry')}
          </Button>
        </Alert>
      ) : null}
      {synchronize.isError ? (
        <Alert tone="danger" title={t('Accounts could not be synchronized')}>
          {t('Accounts could not be synchronized. Try again later.')}
        </Alert>
      ) : null}
      {accounts.data !== undefined && accounts.data.length === 0 ? (
        <EmptyState
          action={
            <Button
              loading={synchronize.isPending}
              onClick={() => synchronize.mutate()}
              type="button"
            >
              {t('Sync accounts')}
            </Button>
          }
          title={t('No synchronized accounts')}
        >
          <p>
            {t('Use Sync accounts to import the latest Monobank accounts.')}
          </p>
        </EmptyState>
      ) : null}
      {accounts.data === undefined || accounts.data.length === 0 ? null : (
        <>
          <section
            aria-labelledby="account-balance-summary-title"
            className="accounts-balance-summary"
          >
            <header className="accounts-balance-summary__heading">
              <div>
                <h2 id="account-balance-summary-title">
                  {t('Account balances')}
                  <InfoTooltip
                    description={t(
                      'Balances are shown in their original currencies.',
                    )}
                    label={t('Account balances')}
                  />
                </h2>
                <p>{t('Balances are shown in their original currencies.')}</p>
              </div>
              <span>
                {t('{count} accounts', { count: accounts.data.length })}
              </span>
            </header>
            <ul className="accounts-currency-summary">
              {balances.map((balance) => (
                <li key={balance.code}>
                  <span
                    aria-hidden="true"
                    className="accounts-currency-summary__icon"
                  >
                    {balance.code.slice(0, 1)}
                  </span>
                  <span className="accounts-currency-summary__copy">
                    <span>{balance.displayName}</span>
                    <small>
                      {t('{count} accounts', { count: balance.accountCount })}
                    </small>
                  </span>
                  <strong>
                    {formatAccountBalance(
                      balance.balanceMinor,
                      balance.minorUnit,
                      balance.code,
                    )}
                  </strong>
                </li>
              ))}
            </ul>
          </section>
          <Card
            actions={
              <span className="accounts-list-card__count">
                {t('{count} accounts', { count: accounts.data.length })}
              </span>
            }
            className="accounts-list-card"
            title={t('Accounts')}
          >
            <ul className="accounts-list" aria-label={t('Accounts')}>
              {accounts.data.map((account) => (
                <AccountRow account={account} key={account.id} />
              ))}
            </ul>
          </Card>
        </>
      )}
    </PageSurface>
  )
}

function AccountRow({ account }: { account: AccountSummary }) {
  const { t } = useLocalization()
  const primaryCard = account.cards.find((card) => card.isActive)
  const balance = formatAccountBalance(
    account.balanceMinor,
    account.currency.minorUnit,
    account.currency.code,
  )

  return (
    <li className="account-row">
      <span aria-hidden="true" className="account-row__icon">
        {account.type.slice(0, 1).toUpperCase()}
      </span>
      <div className="account-row__identity">
        <strong>{displayAccountType(account.type)}</strong>
        <span>
          {account.currency.displayName} · {t('Account')}
        </span>
        {primaryCard === undefined ? null : (
          <small>
            {t('Card')} •••• {primaryCard.maskedPan.slice(-4)}
          </small>
        )}
      </div>
      <div className="account-row__balance">
        <strong>{balance}</strong>
        <span>{account.currency.code}</span>
      </div>
      <div className="account-row__status">
        <StatusBadge
          label={t(account.isActive ? 'Active' : 'Unavailable')}
          tone={account.isActive ? 'success' : 'neutral'}
        />
      </div>
    </li>
  )
}

function displayAccountType(type: string): string {
  return type.length === 0
    ? type
    : `${type.charAt(0).toUpperCase()}${type.slice(1)}`
}
