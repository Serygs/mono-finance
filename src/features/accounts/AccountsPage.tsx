import { useMemo } from 'react'
import { useAccountsQuery } from './account-queries'
import { StatusBadge } from '../../components/ui/Chips'
import { Button } from '../../components/ui/Controls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { MoneyText } from '../../components/ui/MoneyText'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { InfoTooltip } from '../../components/ui/Surfaces'
import { useOnlineState } from '../../lib/use-online-state'
import { useLocalization } from '../localization/localization'
import {
  accountVisualIdentity,
  currencyDisplayName,
  formatAccountBalance,
} from './account-formatting'
import { summarizeCurrencyBalances } from './account-summary'
import type { AccountSummary } from './account-types'
import { useAccountSync } from './use-account-sync'

export function AccountsPage() {
  const { locale, t } = useLocalization()
  const accounts = useAccountsQuery()
  const synchronize = useAccountSync()
  const online = useOnlineState()
  const balances = useMemo(
    () => summarizeCurrencyBalances(accounts.data ?? []),
    [accounts.data],
  )
  const knownAccounts = accounts.data !== undefined
  const syncButton = (
    <Button
      loading={synchronize.isPending}
      disabled={!online}
      onClick={synchronize.sync}
      type="button"
      variant="secondary"
    >
      <Icon name="sync" />
      {t(synchronize.isPending ? 'Syncing accounts…' : 'Sync accounts')}
    </Button>
  )

  return (
    <PageSurface className="accounts-page">
      <PageHeader
        actions={syncButton}
        id="accounts-title"
        title={t('Accounts')}
      />
      {!online ? (
        <p className="accounts-sync-status" role="status">
          {t(
            'Connect to the internet to sync accounts. Previously loaded balances remain visible.',
          )}
        </p>
      ) : null}
      {synchronize.isPending ? (
        <p className="accounts-sync-status" role="status">
          {t(
            'Updating account balances. This does not import transaction history.',
          )}
        </p>
      ) : null}
      {synchronize.isSuccess && !synchronize.isPending ? (
        <p className="accounts-sync-status" role="status">
          {t('Account balances updated. Transaction history sync is separate.')}
        </p>
      ) : null}
      {synchronize.isError ? (
        <Alert tone="danger" title={t('Accounts could not be synchronized')}>
          <p>{t('Accounts could not be synchronized. Try again later.')}</p>
          <Button
            variant="secondary"
            disabled={!online}
            onClick={synchronize.sync}
            type="button"
          >
            {t('Retry')}
          </Button>
        </Alert>
      ) : null}
      {accounts.isPending && !knownAccounts ? (
        <Skeleton label={t('Loading accounts…')} lines={5} />
      ) : null}
      {accounts.isError ? (
        <Alert
          tone="danger"
          title={t('Accounts could not be loaded. Try again later.')}
        >
          <Button
            variant="secondary"
            disabled={!online || accounts.isFetching}
            onClick={() => void accounts.refetch()}
            type="button"
          >
            {t('Retry')}
          </Button>
        </Alert>
      ) : null}
      {accounts.data?.length === 0 ? (
        <EmptyState title={t('No synchronized accounts')}>
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
            <h2 id="account-balance-summary-title">
              {t('Account balances')}
              <InfoTooltip
                label={t('Account balances')}
                description={t(
                  'Balances are shown in their original currencies.',
                )}
              />
            </h2>
            <ul className="accounts-currency-summary">
              {balances.map((balance) => (
                <li key={balance.code}>
                  <span>
                    {currencyDisplayName(
                      balance.code,
                      balance.displayName,
                      locale,
                    )}
                  </span>
                  <strong>
                    <MoneyText
                      locale={locale}
                      value={formatAccountBalance(
                        balance.balanceMinor,
                        balance.minorUnit,
                        balance.code,
                        locale,
                        t('minor units'),
                      )}
                    />
                  </strong>
                </li>
              ))}
            </ul>
          </section>
          <section
            aria-labelledby="accounts-list-title"
            className="accounts-list-section"
          >
            <header>
              <h2 id="accounts-list-title">
                {t('Your accounts')}
                <InfoTooltip
                  label={t('Active')}
                  description={t(
                    'Active describes account availability, not when its balance was updated.',
                  )}
                />
              </h2>
              <span>
                {t('{count} accounts', { count: accounts.data.length })}
              </span>
            </header>
            <ul className="accounts-list" aria-label={t('Your accounts')}>
              {accounts.data.map((account) => (
                <AccountRow account={account} key={account.id} />
              ))}
            </ul>
          </section>
        </>
      )}
    </PageSurface>
  )
}

function AccountRow({ account }: { account: AccountSummary }) {
  const { locale, t } = useLocalization()
  const card = account.cards.find((card) => card.isActive) ?? account.cards[0]
  // Type is the only account name in the current safe API contract.
  const name =
    account.type === ''
      ? t('Account')
      : ['black', 'white', 'platinum', 'iron', 'yellow'].includes(account.type)
        ? `${account.type[0]!.toUpperCase()}${account.type.slice(1)}`
        : account.type
  return (
    <li className="account-row" data-account-id={account.id}>
      <span
        aria-hidden="true"
        className={`account-row__visual account-row__visual--${accountVisualIdentity(account.id, account.type)}`}
      >
        <Icon name="accounts" />
      </span>
      <div className="account-row__identity">
        <strong>{name}</strong>
      </div>
      <div className="account-row__metadata">
        <span>
          {card?.maskedPan
            ? `${t('Card')} ${card.maskedPan}`
            : `${t('Account ID')} ${account.id}`}
        </span>
        <StatusBadge
          label={t(account.isActive ? 'Active' : 'Unavailable')}
          tone={account.isActive ? 'success' : 'neutral'}
        />
      </div>
      <strong className="account-row__balance">
        <MoneyText
          locale={locale}
          value={formatAccountBalance(
            account.balanceMinor,
            account.currency.minorUnit,
            account.currency.code,
            locale,
            t('minor units'),
          )}
        />
      </strong>
    </li>
  )
}
