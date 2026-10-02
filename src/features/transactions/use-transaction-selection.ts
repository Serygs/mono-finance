import { useState } from 'react'
import type { TransactionListItem } from './transaction-types'
import type { TransactionDetailsProps } from './TransactionDetails'

export function useTransactionSelection() {
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionListItem | null>(null)
  const updateSelectedTransaction: TransactionDetailsProps['onTransactionUpdated'] =
    (correction, metadata) => {
      setSelectedTransaction((current) =>
        current === null || current.id !== correction.id
          ? current
          : {
              ...current,
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
      )
    }
  return {
    selectedTransaction,
    setSelectedTransaction,
    updateSelectedTransaction,
  }
}
