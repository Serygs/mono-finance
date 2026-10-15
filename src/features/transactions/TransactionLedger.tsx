import type { DragEvent } from 'react'
import { useLocalization } from '../localization/localization'
import {
  formatDateGroupAmount,
  formatTransactionDateGroup,
  groupTransactionsByDate,
} from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import { TransactionRow } from './TransactionRow'
import type { CustomCategory } from '../categories/categories-api'
import {
  COMPENSATION_DRAG_TYPE,
  type CompensationDrop,
} from './use-compensation-drop'

export function TransactionLedger({
  transactions,
  selectedTransaction,
  onSelect,
  categories,
  compensationDrop,
}: {
  transactions: TransactionListItem[]
  selectedTransaction: TransactionListItem | null
  onSelect(transaction: TransactionListItem): void
  categories: CustomCategory[]
  compensationDrop?: CompensationDrop
}) {
  const { locale, t } = useLocalization()
  const transactionGroups = groupTransactionsByDate(transactions)
  const dateGroupNow = new Date()
  const drop = compensationDrop?.enabled === true ? compensationDrop : null
  return (
    <div className="transactions-ledger-shell">
      {drop === null ? null : (
        <p className="transactions-drag-hint">
          {t(
            'Drag an incoming transaction onto an expense to link a compensation.',
          )}
        </p>
      )}
      <div
        className={
          drop?.dragSource == null
            ? 'transactions-ledger'
            : 'transactions-ledger transactions-ledger--dragging'
        }
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
                  <li
                    key={transaction.id}
                    {...(drop === null
                      ? {}
                      : compensationDragProps(drop, transaction))}
                  >
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

function compensationDragProps(
  drop: CompensationDrop,
  transaction: TransactionListItem,
) {
  const source = drop.dragSource?.id === transaction.id
  const acceptsDrop = drop.canDrop(transaction)
  const className = [
    transaction.originalAmountMinor > 0
      ? 'transactions-ledger-item--draggable'
      : '',
    source ? 'transactions-ledger-item--drag-source' : '',
    acceptsDrop ? 'transactions-ledger-item--drop-candidate' : '',
    acceptsDrop && drop.dropTargetId === transaction.id
      ? 'transactions-ledger-item--drop-target'
      : '',
  ]
    .filter(Boolean)
    .join(' ')
  return {
    className: className === '' ? undefined : className,
    draggable: transaction.originalAmountMinor > 0 && !drop.isPending,
    onDragStart(event: DragEvent<HTMLLIElement>) {
      if (transaction.originalAmountMinor <= 0 || drop.isPending) {
        event.preventDefault()
        return
      }
      event.dataTransfer.setData(COMPENSATION_DRAG_TYPE, transaction.id)
      event.dataTransfer.effectAllowed = 'link'
      drop.startDrag(transaction)
    },
    onDragEnd: drop.endDrag,
    onDragEnter(event: DragEvent<HTMLLIElement>) {
      if (!acceptsDrop) return
      event.preventDefault()
      drop.setDropTargetId(transaction.id)
    },
    onDragOver(event: DragEvent<HTMLLIElement>) {
      if (!acceptsDrop) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'link'
    },
    onDragLeave(event: DragEvent<HTMLLIElement>) {
      if (
        event.relatedTarget instanceof Node &&
        event.currentTarget.contains(event.relatedTarget)
      )
        return
      if (drop.dropTargetId === transaction.id) drop.setDropTargetId(null)
    },
    onDrop(event: DragEvent<HTMLLIElement>) {
      if (!acceptsDrop) return
      event.preventDefault()
      drop.drop(transaction)
    },
  }
}
