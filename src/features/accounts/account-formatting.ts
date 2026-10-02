import { formatMoney } from '../../lib/money-presentation'

export function formatAccountBalance(
  amountMinor: bigint | number,
  minorUnit: number,
  currencyCode: string,
  locale = 'en-US',
  unknownMinorUnitsLabel = 'minor units',
): string {
  return formatMoney(amountMinor, {
    minorUnit,
    currencyCode,
    locale,
    unknownMinorUnitsLabel,
  })
}

export function currencyDisplayName(
  code: string,
  apiName: string,
  locale: string,
) {
  if (!/^[A-Z]{3}$/.test(code)) return code
  return (
    new Intl.DisplayNames(locale, { type: 'currency', fallback: 'none' }).of(
      code,
    ) ?? apiName
  )
}

export function accountVisualIdentity(id: string, type: string) {
  if (type === 'black' || type === 'white') return type
  let hash = 0
  for (const character of id)
    hash = Math.imul(hash, 31) + character.charCodeAt(0)
  return ['blue', 'violet', 'green'][(hash >>> 0) % 3]!
}

/** Identity is retained in selection/API values, never used as display fallback. */
export function accountName(type: string, fallback: string): string {
  const name = type.trim()
  if (!name) return fallback
  return ['black', 'white', 'platinum', 'iron', 'yellow'].includes(name)
    ? `${name[0]!.toUpperCase()}${name.slice(1)}`
    : name
}

export function compactCardNumber(
  maskedPan: string | null | undefined,
): string | null {
  const lastFour = maskedPan?.match(/(\d{4})$/)?.[1]
  return lastFour === undefined ? null : `•••• ${lastFour}`
}

export function accountDisplayLabel(
  input: {
    type: string
    currencyCode: string
    maskedPan?: string | null | undefined
  },
  fallback: string,
): string {
  return [
    accountName(input.type, fallback),
    compactCardNumber(input.maskedPan),
    input.currencyCode,
  ]
    .filter(Boolean)
    .join(' · ')
}
