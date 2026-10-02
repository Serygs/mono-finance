import { formatMoney } from '../../lib/money-presentation'

export function formatAccountBalance(
  amountMinor: bigint | number,
  minorUnit: number,
  currencyCode: string,
): string {
  return formatMoney(amountMinor, {
    minorUnit,
    currencyCode,
    locale: 'en-US',
    presentation: 'code-suffix',
  })
}
