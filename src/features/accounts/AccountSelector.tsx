import type { AccountFilter } from './account-filter-storage'
import { formatAccountBalance } from './account-formatting'
import type { AccountSummary } from './account-types'
import { AccountChip } from '../../components/ui/Chips'
import { EmptyState } from '../../components/ui/Feedback'

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
  if (accounts.length === 0) {
    return (
      <EmptyState title="No synchronized accounts">
        <p>Use Sync accounts to import the latest Monobank accounts.</p>
      </EmptyState>
    )
  }

  return (
    <section className="account-filter" aria-labelledby="account-filter-title">
      <div className="account-filter-heading">
        <div>
          <h2 id="account-filter-title">Accounts in view</h2>
          <p>Choose one, combine several, or return to the full picture.</p>
        </div>
        <AccountChip
          className="all-accounts-button"
          detail={accounts.length}
          label="All accounts"
          onClick={onSelectAll}
          selected={filter.mode === 'all'}
        />
      </div>

      <div className="account-shelf" aria-label="Account filter">
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
                <span>{accountName(account)}</span>
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
                {cardDescription(account)}
                {account.isActive ? null : (
                  <span className="inactive-badge">Unavailable</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function accountName(account: AccountSummary): string {
  return `${account.type.charAt(0).toUpperCase()}${account.type.slice(1)} account`
}

function cardDescription(account: AccountSummary): string {
  const activeCard = account.cards.find((card) => card.isActive)
  if (activeCard === undefined) {
    return account.currency.displayName
  }
  return `Card •••• ${activeCard.maskedPan.slice(-4)}`
}
