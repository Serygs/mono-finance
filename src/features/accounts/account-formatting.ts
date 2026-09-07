const ISO_ALPHA_CODE = /^[A-Z]{3}$/

export function formatAccountBalance(
  amountMinor: number,
  minorUnit: number,
  currencyCode: string,
): string {
  const amount = BigInt(amountMinor)
  const absolute = amount < 0n ? -amount : amount
  const sign = amount < 0n ? '−' : ''

  if (!ISO_ALPHA_CODE.test(currencyCode)) {
    return `${sign}${formatInteger(absolute)} minor units · ISO ${currencyCode}`
  }

  const factor = 10n ** BigInt(minorUnit)
  const integer = absolute / factor
  const fraction = (absolute % factor).toString().padStart(minorUnit, '0')
  const decimal = minorUnit === 0 ? '' : `.${fraction}`
  return `${sign}${formatInteger(integer)}${decimal} ${currencyCode}`
}

function formatInteger(value: bigint): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)
}
