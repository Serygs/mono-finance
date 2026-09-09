import type { AccountFilter } from './account-filter-storage'
import { formatAccountBalance } from './account-formatting'
import type { AccountSummary } from './account-types'
import { AccountChip } from '../../components/ui/Chips'
import { EmptyState } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'

interface AccountSelectorProps {
  accounts: AccountSummary[]
  filter: AccountFilter
  onSelectAll(): void
  onToggle(accountId: string): void
}

export function AccountSelector({
  accounts,
  filter,
  onSelectAll,
  onToggle,
}: AccountSelectorProps) {
  const { t } = useLocalization()
  if (accounts.length === 0) {
    return (
      <EmptyState title={t('No synchronized accounts')}>
        <p>{t('Use Sync accounts to import the latest Monobank accounts.')}</p>
      </EmptyState>
    )
  }

  return (
    <section className="account-filter" aria-labelledby="account-filter-title">
      <div className="account-filter-heading">
        <div>
          <h2 id="account-filter-title">{t('Accounts in view')}</h2>
          <p>
            {t('Choose one, combine several, or return to the full picture.')}
          </p>
        </div>
        <AccountChip
          className="all-accounts-button"
          detail={accounts.length}
          label={t('All accounts')}
          onClick={onSelectAll}
          selected={filter.mode === 'all'}
        />
      </div>

      <div className="account-shelf" aria-label={t('Account filter')}>
        {accounts.map((account) => {
          const isSelected =
            filter.mode === 'selected' && filter.accountIds.includes(account.id)
          return (
            <button
              aria-pressed={isSelected}
              className="account-tile"
              key={account.id}
              onClick={() => onToggle(account.id)}
              type="button"
            >
              <span className="account-tile-topline">
                <span>{accountName(account, t)}</span>
                <span className="currency-badge">{account.currency.code}</span>
              </span>
              <strong>
                {formatAccountBalance(
                  account.balanceMinor,
                  account.currency.minorUnit,
                  account.currency.code,
                )}
              </strong>
              <span className="account-tile-detail">
                {cardDescription(account, t)}
                {account.isActive ? null : (
                  <span className="inactive-badge">{t('Unavailable')}</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function accountName(
  account: AccountSummary,
  t: (key: string) => string,
): string {
  return `${account.type.charAt(0).toUpperCase()}${account.type.slice(1)} ${t('account')}`
}

function cardDescription(
  account: AccountSummary,
  t: (key: string) => string,
): string {
  const activeCard = account.cards.find((card) => card.isActive)
  if (activeCard === undefined) {
    return account.currency.displayName
  }
  return `${t('Card')} •••• ${activeCard.maskedPan.slice(-4)}`
}
