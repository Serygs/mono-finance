import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTransactionMutations } from './use-transaction-mutations'

import { useLocalization } from '../localization/localization'
import { parseAmountInputToMinor } from './transaction-formatting'
import type { TransactionListItem } from './transaction-types'
import { getCompensationDetails } from './transactions-api'

import { useCategoriesQuery } from '../categories/category-queries'
import { toEditableAmount } from './transaction-amount-input'
import { transactionQueryKeys } from './transaction-queries'
import type { TransactionDetailsProps } from './TransactionDetails'

export function useTransactionDetails({
  transaction,
  onTransactionUpdated,
}: Omit<TransactionDetailsProps, 'transaction'> & {
  transaction: TransactionListItem
}) {
  const { t } = useLocalization()
  const [adjustmentAmount, setAdjustmentAmount] = useState(() =>
    toEditableAmount(
      transaction.effectiveAmountMinor,
      transaction.currencyMinorUnit,
    ),
  )
  const [adjustmentNote, setAdjustmentNote] = useState(
    transaction.adjustmentNote ?? '',
  )
  const [exclusionReason, setExclusionReason] = useState(
    transaction.exclusionReason ?? '',
  )
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  )
  const [categoryId, setCategoryId] = useState(
    transaction.category.source === 'custom'
      ? (transaction.category.id ?? '')
      : '',
  )
  const categoriesQuery = useCategoriesQuery()
  const compensationQuery = useQuery({
    enabled: transaction.originalAmountMinor < 0,
    queryFn: () => getCompensationDetails(transaction.id),
    queryKey: transactionQueryKeys.compensations(transaction.id),
  })
  const [compensationTransactionId, setCompensationTransactionId] = useState('')
  const [compensationAmount, setCompensationAmount] = useState('')

  const mutations = useTransactionMutations(
    transaction,
    onTransactionUpdated,
    () => setCategoryId(''),
  )
  const { adjustmentMutation } = mutations

  function submitAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const adjustedAmountMinor = parseAmountInputToMinor(
      adjustmentAmount,
      transaction.currencyMinorUnit,
    )
    if (adjustedAmountMinor === null) {
      setValidationMessage(
        t('Enter an amount with at most {count} decimal places.', {
          count: transaction.currencyMinorUnit,
        }),
      )
      return
    }
    if (
      (transaction.effectiveAmountMinor < 0 && adjustedAmountMinor > 0) ||
      (transaction.effectiveAmountMinor > 0 && adjustedAmountMinor < 0)
    ) {
      setValidationMessage(
        t('The adjusted amount must keep the transaction direction.'),
      )
      return
    }
    setValidationMessage(null)
    adjustmentMutation.mutate({
      adjustedAmountMinor,
      note: adjustmentNote.trim() || null,
    })
  }

  return {
    adjustmentAmount,
    setAdjustmentAmount,
    adjustmentNote,
    setAdjustmentNote,
    exclusionReason,
    setExclusionReason,
    validationMessage,
    setValidationMessage,
    categoryId,
    setCategoryId,
    categoriesQuery,
    compensationQuery,
    compensationTransactionId,
    setCompensationTransactionId,
    compensationAmount,
    setCompensationAmount,
    ...mutations,
    submitAdjustment,
  }
}
