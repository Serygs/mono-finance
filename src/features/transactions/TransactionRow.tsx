import { transactionCategoryLabel } from './transaction-category-presentation'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { formatMoney } from '../../lib/money-presentation'
import { formatEpochDate } from '../../lib/date-presentation'
import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'
import {
  accountLabel,
  formatTransactionAmount,
  formatTransactionClock,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import {
  resolveRecentTransactionVisual,
  resolveTransactionCategoryVisual,
} from './transaction-visual'
import type { CustomCategory } from '../categories/categories-api'

export function TransactionRow({
  transaction,
  selected,
  onSelect,
  categories,
}: {
  transaction: TransactionListItem
  selected: boolean
  onSelect(transaction: TransactionListItem): void
  categories: CustomCategory[]
}) {
  const { locale, t } = useLocalization()
  const visual = resolveRecentTransactionVisual(transaction, categories)
  const amount = formatTransactionAmount(transaction, locale)
  const categoryLabel = transactionCategoryLabel(transaction.category, t)
  const fullCategoryLabel = transaction.category.name ?? t('Uncategorized')
  return (
    <button
      aria-pressed={selected}
      aria-haspopup="dialog"
      className={`transactions-ledger-row${amount.length > 18 ? ' transactions-ledger-row--wide-amount' : ''}`}
      key={transaction.id}
      onClick={() => onSelect(transaction)}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`transaction-avatar transaction-avatar--${resolveTransactionCategoryVisual(transaction.category.name).tone}${visual.colorToken === null ? '' : ` ui-visual--${visual.colorToken}`}`}
      >
        {visual.icon === null ? (
          transaction.originalDescription.slice(0, 1)
        ) : (
          <CategoryIcon token={visual.icon} />
        )}
      </span>
      <span className="transactions-ledger-row__transaction">
        <strong>{transaction.originalDescription}</strong>
        <TransactionIndicators transaction={transaction} />
      </span>
      <span className="transactions-ledger-row__metadata">
        <span className="transactions-ledger-row__category">
          {categoryLabel === fullCategoryLabel ? (
            categoryLabel
          ) : (
            <>
              <span aria-hidden="true">{categoryLabel}</span>
              <span className="sr-only">{fullCategoryLabel}</span>
            </>
          )}
        </span>
        <span className="transactions-ledger-row__account">
          {accountLabel(transaction, t('Account'))}
        </span>
        <span className="transactions-ledger-row__date">
          <time
            dateTime={new Date(
              transaction.originalTimestamp * 1000,
            ).toISOString()}
          >
            {formatTransactionClock(transaction.originalTimestamp, locale)}
          </time>
        </span>
      </span>
      <span
        className={
          transaction.effectiveAmountMinor > 0
            ? 'transactions-ledger-row__amount is-income'
            : 'transactions-ledger-row__amount'
        }
      >
        {amount}
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

// The overview and ledger deliberately retain different row compositions.
export function RecentTransactionRow({
  transaction,
  minorUnit,
  onSelect,
  visual,
}: {
  transaction: TransactionListItem
  minorUnit: number
  visual: { icon: string | null; colorToken: string | null }
  onSelect(transaction: TransactionListItem): void
}) {
  const { locale, t } = useLocalization()
  return (
    <li>
      <button
        className="recent-transaction-row"
        aria-haspopup="dialog"
        type="button"
        onClick={() => onSelect(transaction)}
      >
        <span
          aria-hidden="true"
          className={`${
            transaction.effectiveAmountMinor >= 0
              ? 'recent-transaction-icon is-income'
              : 'recent-transaction-icon'
          }${visual.colorToken === null ? '' : ` ui-visual--${visual.colorToken}`}`}
        >
          {visual.icon === null ? (
            transaction.originalDescription.slice(0, 1)
          ) : (
            <CategoryIcon token={visual.icon} />
          )}
        </span>
        <span className="recent-transaction-merchant">
          <strong>{transaction.originalDescription}</strong>
          <small>
            <time>
              {formatEpochDate(
                transaction.originalTimestamp,
                { day: 'numeric', month: 'short' },
                locale,
              )}
            </time>
            {' · '}
            {accountLabel(transaction, t('Account'))}
            <TransactionIndicators transaction={transaction} />
          </small>
        </span>
        <b
          className={
            transaction.effectiveAmountMinor >= 0 ? 'is-income' : undefined
          }
        >
          {formatMoney(transaction.effectiveAmountMinor, {
            currencyCode: transaction.currencyCode,
            minorUnit,
            locale,
            signDisplay: 'exceptZero',
          })}
        </b>
      </button>
    </li>
  )
}
