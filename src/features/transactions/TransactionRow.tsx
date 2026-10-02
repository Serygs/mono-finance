import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { formatMoney } from '../../lib/money-presentation'
import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'
import {
  accountLabel,
  formatRecentTransactionDate,
  formatTransactionAmount,
  formatTransactionClock,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import { resolveTransactionCategoryVisual } from './transaction-visual'

export function TransactionRow({
  transaction,
  selected,
  onSelect,
}: {
  transaction: TransactionListItem
  selected: boolean
  onSelect(transaction: TransactionListItem): void
}) {
  const { t } = useLocalization()
  return (
    <button
      aria-pressed={selected}
      className="transactions-ledger-row"
      key={transaction.id}
      onClick={() => onSelect(transaction)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`transaction-avatar transaction-avatar--${resolveTransactionCategoryVisual(transaction.category.name).tone}`}
      >
        <TransactionCategoryVisual transaction={transaction} />
      </span>
      <span className="transactions-ledger-row__transaction">
        <strong>{transaction.originalDescription}</strong>
        <TransactionIndicators transaction={transaction} />
      </span>
      <span
        className="transactions-ledger-row__category"
        data-account={accountLabel(transaction)}
      >
        {transaction.category.name ?? t('Uncategorized')}
      </span>
      <span className="transactions-ledger-row__account">
        {accountLabel(transaction)}
      </span>
      <span className="transactions-ledger-row__date">
        <span className="transactions-ledger-row__desktop-time">
          {formatTransactionClock(transaction.originalTimestamp)}
        </span>
        <span className="transactions-ledger-row__mobile-time">
          {formatTransactionClock(transaction.originalTimestamp)}
        </span>
      </span>
      <span
        className={
          transaction.effectiveAmountMinor < 0
            ? 'transactions-ledger-row__amount is-expense'
            : 'transactions-ledger-row__amount is-income'
        }
      >
        {formatTransactionAmount(transaction)}
      </span>
      <span aria-hidden="true" className="transactions-ledger-row__action">
        •••
      </span>
    </button>
  )
}
function TransactionIndicators({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const { t } = useLocalization()
  const labels = [
    transaction.hasAdjustment ? 'Adjusted' : null,
    transaction.hasCompensation ? 'Compensated' : null,
    transaction.isExcluded ? 'Excluded' : null,
  ].filter((label): label is TranslationKey => label !== null)
  return labels.length === 0 ? null : (
    <span className="transaction-indicators">
      {labels.map((label) => (
        <span key={label}>{t(label)}</span>
      ))}
    </span>
  )
}

function TransactionCategoryVisual({
  transaction,
}: {
  transaction: TransactionListItem
}) {
  const visual = resolveTransactionCategoryVisual(transaction.category.name)
  return visual.icon === null ? (
    <span>{transaction.originalDescription.slice(0, 1)}</span>
  ) : (
    <CategoryIcon token={visual.icon} />
  )
}

// The overview and ledger deliberately retain different row compositions.
export function RecentTransactionRow({
  transaction,
  minorUnit,
  onSelect,
}: {
  transaction: TransactionListItem
  minorUnit: number
  onSelect(transaction: TransactionListItem): void
}) {
  const { locale, t } = useLocalization()
  return (
    <li>
      <button
        className="recent-transaction-row"
        type="button"
        onClick={() => onSelect(transaction)}
      >
        <span
          aria-hidden="true"
          className={
            transaction.effectiveAmountMinor >= 0
              ? 'recent-transaction-icon is-income'
              : 'recent-transaction-icon'
          }
        >
          {transaction.originalDescription.slice(0, 1)}
        </span>
        <span className="recent-transaction-merchant">
          <strong>{transaction.originalDescription}</strong>
          <small>
            {transaction.category.name ?? t('Uncategorized')} ·{' '}
            {transaction.account.type}
          </small>
        </span>
        <time>
          {formatRecentTransactionDate(transaction.originalTimestamp, locale)}
        </time>
        <b
          className={
            transaction.effectiveAmountMinor >= 0 ? 'is-income' : undefined
          }
        >
          {formatMoney(transaction.effectiveAmountMinor, {
            currencyCode: transaction.currencyCode,
            minorUnit,
            locale,
          })}
        </b>
      </button>
    </li>
  )
}
