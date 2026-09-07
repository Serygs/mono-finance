import type { TransactionListItem } from './transaction-types'

export function formatTransactionAmount(
  transaction: TransactionListItem,
): string {
  return new Intl.NumberFormat(undefined, {
    currency: transaction.currencyCode,
    currencyDisplay: 'code',
    minimumFractionDigits: transaction.currencyMinorUnit,
    maximumFractionDigits: transaction.currencyMinorUnit,
    style: 'currency',
  }).format(
    transaction.effectiveAmountMinor / 10 ** transaction.currencyMinorUnit,
  )
}

export function formatTransactionTime(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(epochSeconds * 1_000)
}

export function accountLabel(transaction: TransactionListItem): string {
  const type = `${transaction.account.type.charAt(0).toUpperCase()}${transaction.account.type.slice(1)}`
  return transaction.account.maskedPan === null
    ? `${type} account`
    : `${type} •••• ${transaction.account.maskedPan.slice(-4)}`
}

export function parseAmountInputToMinor(
  value: string,
  minorUnit: number,
): number | null {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim())
  if (match === null) return null
  const whole = match[2]
  const fraction = match[3] ?? ''
  if (whole === undefined || fraction.length > minorUnit) return null
  const scale = 10 ** minorUnit
  const amount = Number(whole) * scale + Number(fraction.padEnd(minorUnit, '0'))
  if (!Number.isSafeInteger(amount)) return null
  return match[1] === '-' ? -amount : amount
}
