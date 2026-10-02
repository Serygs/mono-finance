import { formatEpochDate } from '../../lib/date-presentation'
import { formatMoney } from '../../lib/money-presentation'
import type { TransactionListItem } from './transaction-types'
import { ENGLISH_MESSAGES, UKRAINIAN_MESSAGES } from '../localization/messages'

export function formatTransactionAmount(
  transaction: TransactionListItem,
  locale?: string,
): string {
  return formatMinorAmount(
    transaction.effectiveAmountMinor,
    transaction,
    locale,
  )
}

export function formatTransactionTime(
  epochSeconds: number,
  locale?: string,
): string {
  return formatEpochDate(
    epochSeconds,
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
    locale,
  )
}

export function formatTransactionDate(epochSeconds: number): string {
  return formatEpochDate(epochSeconds, { dateStyle: 'full' })
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
    ? `${type} · ${transaction.currencyCode} · ${transaction.account.id}`
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

export function formatDateGroupAmount(
  transactions: TransactionListItem[],
  locale?: string,
): string {
  const [firstTransaction] = transactions
  if (
    firstTransaction === undefined ||
    transactions.some(
      (transaction) =>
        transaction.currencyCode !== firstTransaction.currencyCode ||
        transaction.currencyMinorUnit !== firstTransaction.currencyMinorUnit,
    )
  ) {
    return ''
  }
  const amountMinor = transactions.reduce(
    (sum, transaction) => sum + BigInt(transaction.effectiveAmountMinor),
    0n,
  )
  return formatMinorAmount(amountMinor, firstTransaction, locale)
}

export function formatTransactionClock(
  epochSeconds: number,
  locale?: string,
): string {
  return formatEpochDate(epochSeconds, { timeStyle: 'short' }, locale)
}

export function formatMinorAmount(
  amountMinor: number | bigint,
  transaction: TransactionListItem,
  locale?: string,
): string {
  return formatMoney(amountMinor, {
    currencyCode: transaction.currencyCode,
    minorUnit: transaction.currencyMinorUnit,
    ...(locale === undefined ? {} : { locale }),
    signDisplay: 'exceptZero',
    unknownMinorUnitsLabel: (locale === 'uk'
      ? UKRAINIAN_MESSAGES
      : ENGLISH_MESSAGES)['minor units'],
  }).replace(/^-/, '\u2212')
}

export function formatRecentTransactionDate(
  timestamp: number,
  locale: string,
): string {
  return formatEpochDate(
    timestamp,
    { day: 'numeric', hour: '2-digit', minute: '2-digit', month: 'short' },
    locale,
  )
}
