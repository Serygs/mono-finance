import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  resetTransactionCategory,
  saveTransactionCategory,
} from '../categories/categories-api'
import {
  refreshCompensationDetails,
  refreshTransactionLedger,
  transactionQueryKeys,
} from './transaction-queries'
import type { TransactionListItem } from './transaction-types'
import type { TransactionDetailsProps } from './TransactionDetails'
import {
  excludeTransaction,
  linkCompensation,
  resetTransactionAdjustment,
  restoreTransaction,
  saveTransactionAdjustment,
  unlinkCompensation,
} from './transactions-api'

export function useTransactionMutations(
  transaction: TransactionListItem,
  onTransactionUpdated: TransactionDetailsProps['onTransactionUpdated'],
  onCategoryReset: () => void,
  onAdjustmentReset: () => void,
) {
  const queryClient = useQueryClient()
  const refreshTransactions = () => void refreshTransactionLedger(queryClient)
  const adjustmentMutation = useMutation({
    mutationFn: (input: {
      adjustedAmountMinor: number
      note: string | null
    }) => {
      return saveTransactionAdjustment(transaction.id, input)
    },
    onSuccess: (correction, input) => {
      onTransactionUpdated(correction, { adjustmentNote: input.note })
      refreshTransactions()
      void refreshCompensationDetails(queryClient, transaction.id)
    },
  })
  const resetMutation = useMutation({
    mutationFn: () => {
      return resetTransactionAdjustment(transaction.id)
    },
    onSuccess: (correction) => {
      onAdjustmentReset()
      onTransactionUpdated(correction, { adjustmentNote: null })
      refreshTransactions()
      void refreshCompensationDetails(queryClient, transaction.id)
    },
  })
  const exclusionMutation = useMutation({
    mutationFn: (reason: string | null) => {
      return excludeTransaction(transaction.id, reason)
    },
    onSuccess: (correction, reason) => {
      onTransactionUpdated(correction, { exclusionReason: reason })
      refreshTransactions()
    },
  })
  const restoreMutation = useMutation({
    mutationFn: () => {
      return restoreTransaction(transaction.id)
    },
    onSuccess: (correction) => {
      onTransactionUpdated(correction, { exclusionReason: null })
      refreshTransactions()
    },
  })
  const categoryMutation = useMutation({
    mutationFn: (id: string) => saveTransactionCategory(transaction.id, id),
    onSuccess: (result) => {
      onTransactionUpdated(
        { id: transaction.id },
        {
          category: result.category,
          originalCategory: result.originalCategory,
        },
      )
      refreshTransactions()
    },
  })
  const resetCategoryMutation = useMutation({
    mutationFn: () => resetTransactionCategory(transaction.id),
    onSuccess: (result) => {
      onCategoryReset()
      onTransactionUpdated(
        { id: transaction.id },
        {
          category: result.category,
          originalCategory: result.originalCategory,
        },
      )
      refreshTransactions()
    },
  })
  const compensationMutation = useMutation({
    mutationFn: (input: {
      compensationTransactionId: string
      compensatedAmountMinor: number
    }) => linkCompensation(transaction.id, input),
    onSuccess: (result) => {
      queryClient.setQueryData(
        transactionQueryKeys.compensations(transaction.id),
        result,
      )
      onTransactionUpdated(
        { id: transaction.id },
        { hasCompensation: result.links.length > 0 },
      )
      void refreshCompensationDetails(queryClient, transaction.id)
      refreshTransactions()
    },
  })
  const unlinkCompensationMutation = useMutation({
    mutationFn: (linkId: string) => unlinkCompensation(transaction.id, linkId),
    onSuccess: (result) => {
      queryClient.setQueryData(
        transactionQueryKeys.compensations(transaction.id),
        result,
      )
      onTransactionUpdated(
        { id: transaction.id },
        { hasCompensation: result.links.length > 0 },
      )
      void refreshCompensationDetails(queryClient, transaction.id)
      refreshTransactions()
    },
  })

  const isSaving =
    adjustmentMutation.isPending ||
    resetMutation.isPending ||
    exclusionMutation.isPending ||
    restoreMutation.isPending ||
    categoryMutation.isPending ||
    resetCategoryMutation.isPending ||
    compensationMutation.isPending ||
    unlinkCompensationMutation.isPending
  const mutations = [
    adjustmentMutation,
    resetMutation,
    exclusionMutation,
    restoreMutation,
    categoryMutation,
    resetCategoryMutation,
    compensationMutation,
    unlinkCompensationMutation,
  ]
  const latest = [...mutations].sort(
    (left, right) => right.submittedAt - left.submittedAt,
  )[0]
  const mutationError = latest?.error ?? null

  return {
    adjustmentMutation,
    resetMutation,
    exclusionMutation,
    restoreMutation,
    categoryMutation,
    resetCategoryMutation,
    compensationMutation,
    unlinkCompensationMutation,
    isSaving,
    mutationError,
    saved: !isSaving && latest?.isSuccess === true,
    clearFeedback() {
      for (const mutation of mutations) mutation.reset()
    },
  }
}
