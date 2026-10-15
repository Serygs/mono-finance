import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useSyncExternalStore } from 'react'

import {
  refreshCompensationDetails,
  refreshTransactionLedger,
  transactionQueryKeys,
} from './transaction-queries'
import type {
  CompensationDetails,
  TransactionListItem,
} from './transaction-types'
import {
  getCompensationDetails,
  linkCompensation,
  unlinkCompensation,
} from './transactions-api'

export const COMPENSATION_DRAG_TYPE = 'application/x-mono-transaction'

export class NothingToLinkError extends Error {}

export interface CompensationDropResult {
  amountMinor: number
  expense: TransactionListItem
  income: TransactionListItem
  linkId: string
}

export function canDropCompensation(
  source: TransactionListItem | null,
  target: TransactionListItem,
): boolean {
  return (
    source !== null &&
    source.id !== target.id &&
    source.originalAmountMinor > 0 &&
    target.originalAmountMinor < 0 &&
    source.currencyCode === target.currencyCode
  )
}

// The full income is offered, capped by the expense's remaining personal part;
// the Worker remains authoritative for income already used elsewhere.
export function compensationDropAmount(
  income: TransactionListItem,
  details: CompensationDetails,
): number | null {
  const remaining = -details.summary.remainingPersonalExpenseMinor
  if (
    remaining <= 0 ||
    details.links.some((link) => link.compensationTransactionId === income.id)
  )
    return null
  return Math.min(income.originalAmountMinor, remaining)
}

const desktopQuery = '(min-width: 768px)'

function subscribeToDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function useCompensationDrop() {
  const queryClient = useQueryClient()
  // The dedicated mobile layout keeps the details picker as the only path.
  const enabled = useSyncExternalStore(
    subscribeToDesktop,
    () => window.matchMedia(desktopQuery).matches,
    () => false,
  )
  const [dragSource, setDragSource] = useState<TransactionListItem | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

  function applyDetails(expenseId: string, details: CompensationDetails) {
    queryClient.setQueryData(
      transactionQueryKeys.compensations(expenseId),
      details,
    )
    void refreshCompensationDetails(queryClient, expenseId)
    void refreshTransactionLedger(queryClient)
  }

  const linkMutation = useMutation({
    mutationFn: async ({
      expense,
      income,
    }: {
      expense: TransactionListItem
      income: TransactionListItem
    }): Promise<CompensationDropResult> => {
      const current = await queryClient.fetchQuery({
        queryFn: () => getCompensationDetails(expense.id),
        queryKey: transactionQueryKeys.compensations(expense.id),
      })
      const amountMinor = compensationDropAmount(income, current)
      if (amountMinor === null) throw new NothingToLinkError()
      const details = await linkCompensation(expense.id, {
        compensatedAmountMinor: amountMinor,
        compensationTransactionId: income.id,
      })
      applyDetails(expense.id, details)
      const link = details.links.find(
        (item) => item.compensationTransactionId === income.id,
      )
      if (link === undefined) throw new Error('Compensation link missing')
      return { amountMinor, expense, income, linkId: link.id }
    },
  })

  const undoMutation = useMutation({
    mutationFn: async (result: CompensationDropResult) => {
      const details = await unlinkCompensation(result.expense.id, result.linkId)
      applyDetails(result.expense.id, details)
    },
    onSuccess: () => linkMutation.reset(),
  })

  const isPending = linkMutation.isPending || undoMutation.isPending

  return {
    enabled,
    dragSource,
    dropTargetId,
    isPending,
    linkError: linkMutation.error,
    result: linkMutation.data ?? null,
    undoError: undoMutation.error,
    undoPending: undoMutation.isPending,
    canDrop: (target: TransactionListItem) =>
      !isPending && canDropCompensation(dragSource, target),
    startDrag(source: TransactionListItem) {
      if (isPending) return
      setDragSource(source)
    },
    endDrag() {
      setDragSource(null)
      setDropTargetId(null)
    },
    setDropTargetId,
    drop(target: TransactionListItem) {
      const income = dragSource
      setDragSource(null)
      setDropTargetId(null)
      if (income === null || isPending || !canDropCompensation(income, target))
        return
      undoMutation.reset()
      linkMutation.mutate({ expense: target, income })
    },
    undo() {
      if (linkMutation.data === undefined || isPending) return
      undoMutation.mutate(linkMutation.data)
    },
    dismiss() {
      linkMutation.reset()
      undoMutation.reset()
    },
  }
}

export type CompensationDrop = ReturnType<typeof useCompensationDrop>
