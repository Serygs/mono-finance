import { useLocalization } from '../localization/localization'
import {
  formatDateGroupAmount,
  formatTransactionDateGroup,
  groupTransactionsByDate,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import { TransactionRow } from './TransactionRow'
import type { CustomCategory } from '../categories/categories-api'

export function TransactionLedger({
  transactions,
  selectedTransaction,
  onSelect,
  categories,
}: {
  transactions: TransactionListItem[]
  selectedTransaction: TransactionListItem | null
  onSelect(transaction: TransactionListItem): void
  categories: CustomCategory[]
}) {
  const { locale, t } = useLocalization()
  const transactionGroups = groupTransactionsByDate(transactions)
  const dateGroupNow = new Date()
  return (
    <div className="transactions-ledger-shell">
      <div
        className="transactions-ledger"
        aria-label={t('Transactions in chronological order')}
      >
        <div className="transactions-ledger__header" aria-hidden="true">
          <span>{t('Transactions')}</span>
          <span>{t('Category')}</span>
          <span>{t('Account')}</span>
          <span>{t('Date and time')}</span>
          <span>{t('Effective amount')}</span>
        </div>
        {transactionGroups.map((group) => {
          const shownAmount = formatDateGroupAmount(group.transactions, locale)
          return (
            <section className="transactions-date-group" key={group.dateKey}>
              <header className="transactions-date-heading">
                <h2>
                  {formatTransactionDateGroup(group.dateKey, {
                    locale,
                    now: dateGroupNow,
                    today: t('Today'),
                    yesterday: t('Yesterday'),
                  })}
                </h2>
                {shownAmount === '' ? null : (
                  <p className="transactions-shown-total">
                    <span>{t('Shown transactions total')}</span>
                    <strong>{shownAmount}</strong>
                  </p>
                )}
              </header>
              <ul>
                {group.transactions.map((transaction) => (
                  <li key={transaction.id}>
                    <TransactionRow
                      transaction={transaction}
                      selected={selectedTransaction?.id === transaction.id}
                      onSelect={onSelect}
                      categories={categories}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
