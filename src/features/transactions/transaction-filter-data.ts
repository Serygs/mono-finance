import { dateInputToLocalEpoch, localEpoch } from '../../lib/date-presentation'

export type TransactionDatePreset =
  | '7d'
  | '30d'
  | '90d'
  | 'current-month'
  | 'previous-month'
  | 'current-year'
  | 'custom'

export function resolveTransactionDateRange(
  preset: TransactionDatePreset,
  customFrom: string,
  customTo: string,
  now = new Date(),
) {
  const endOfToday =
    new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() /
      1_000 -
    1
  if (preset === 'custom')
    return {
      from: dateInputToLocalEpoch(customFrom),
      to: endDateInputToEpoch(customTo),
    }
  if (preset === 'current-month')
    return {
      from: localEpoch(now.getFullYear(), now.getMonth(), 1),
      to: endOfToday,
    }
  if (preset === 'previous-month')
    return {
      from: localEpoch(now.getFullYear(), now.getMonth() - 1, 1),
      to: localEpoch(now.getFullYear(), now.getMonth(), 1) - 1,
    }
  if (preset === 'current-year')
    return { from: localEpoch(now.getFullYear(), 0, 1), to: endOfToday }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  return { from: endOfToday - (days * 86_400 - 1), to: endOfToday }
}

function endDateInputToEpoch(value: string): number | null {
  const epoch = dateInputToLocalEpoch(value)
  return epoch === null ? null : epoch + 86_399
}
