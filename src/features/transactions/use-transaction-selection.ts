import { useState } from 'react'
import type { TransactionListItem } from './transaction-types'
import type { TransactionDetailsProps } from './TransactionDetails'

export function useTransactionSelection(scope = '') {
  const [selection, setSelection] = useState<{
    scope: string
    transaction: TransactionListItem | null
  }>({ scope, transaction: null })
  if (selection.scope !== scope) setSelection({ scope, transaction: null })
  const selectedTransaction =
    selection.scope === scope ? selection.transaction : null
  const setSelectedTransaction = (transaction: TransactionListItem | null) =>
    setSelection({ scope, transaction })
  const updateSelectedTransaction: TransactionDetailsProps['onTransactionUpdated'] =
    (correction, metadata) => {
      setSelection((current) =>
        current.scope !== scope || current.transaction?.id !== correction.id
          ? current
          : {
              scope,
              transaction: {
                ...current.transaction,
                ...metadata,
                ...(correction.effectiveAmountMinor === undefined
                  ? {}
                  : {
                      effectiveAmountMinor: correction.effectiveAmountMinor,
                    }),
                ...(correction.hasAdjustment === undefined
                  ? {}
                  : { hasAdjustment: correction.hasAdjustment }),
                ...(correction.isExcluded === undefined
                  ? {}
                  : { isExcluded: correction.isExcluded }),
              },
            },
      )
    }
  return {
    selectedTransaction,
    setSelectedTransaction,
    updateSelectedTransaction,
  }
}
