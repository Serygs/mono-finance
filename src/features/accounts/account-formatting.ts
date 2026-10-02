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
