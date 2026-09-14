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

export function formatTransactionDate(epochSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(
    epochSeconds * 1_000,
  )
}

export function formatTransactionDateGroup(
  dateKey: string,
  input: {
    locale: string
    now: Date
    today: string
    yesterday: string
  },
): string {
  const todayKey = localDateKey(input.now.getTime() / 1_000)
  if (dateKey === todayKey) return input.today

  const yesterday = new Date(input.now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateKey === localDateKey(yesterday.getTime() / 1_000)) {
    return input.yesterday
  }

  const date = localDateFromKey(dateKey)
  const includeYear = date.getFullYear() !== input.now.getFullYear()
  return new Intl.DateTimeFormat(input.locale, {
    ...(includeYear ? { year: 'numeric' as const } : {}),
    day: 'numeric',
    month: 'long',
  }).format(date)
}

export function groupTransactionsByDate<
  T extends { originalTimestamp: number },
>(transactions: readonly T[]): Array<{ dateKey: string; transactions: T[] }> {
  const groups = new Map<string, T[]>()
  for (const transaction of transactions) {
    const dateKey = localDateKey(transaction.originalTimestamp)
    const group = groups.get(dateKey)
    if (group === undefined) groups.set(dateKey, [transaction])
    else group.push(transaction)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([dateKey, group]) => ({
      dateKey,
      transactions: group.sort(
        (left, right) => right.originalTimestamp - left.originalTimestamp,
      ),
    }))
}

export function accountLabel(transaction: TransactionListItem): string {
  const type = `${transaction.account.type.charAt(0).toUpperCase()}${transaction.account.type.slice(1)}`
  return transaction.account.maskedPan === null
    ? `${type} account`
    : `${type} •••• ${transaction.account.maskedPan.slice(-4)}`
}

function localDateKey(epochSeconds: number): string {
  const date = new Date(epochSeconds * 1_000)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((value) => String(value).padStart(2, '0'))
    .join('-')
}

function localDateFromKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1)
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
