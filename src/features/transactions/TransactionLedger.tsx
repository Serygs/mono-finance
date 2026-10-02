import { useLocalization } from '../localization/localization'
import {
  formatDateGroupAmount,
  formatTransactionDateGroup,
  groupTransactionsByDate,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import { TransactionRow } from './TransactionRow'

export function TransactionLedger({
  transactions,
  selectedTransaction,
  onSelect,
}: {
  transactions: TransactionListItem[]
  selectedTransaction: TransactionListItem | null
  onSelect(transaction: TransactionListItem): void
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
          <span>{t('Actions')}</span>
        </div>
        {transactionGroups.map((group) => {
          const firstTransaction = group.transactions[0]
          if (firstTransaction === undefined) return null
          return (
            <section className="transactions-date-group" key={group.dateKey}>
              <h2>
                <span>
                  {formatTransactionDateGroup(group.dateKey, {
                    locale,
                    now: dateGroupNow,
                    today: t('Today'),
                    yesterday: t('Yesterday'),
                  })}
                </span>
                <span>{formatDateGroupAmount(group.transactions)}</span>
              </h2>
              {group.transactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                  selected={selectedTransaction?.id === transaction.id}
                  onSelect={onSelect}
                />
              ))}
            </section>
          )
        })}
      </div>
    </div>
  )
}
