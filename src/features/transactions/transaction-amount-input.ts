export function toEditableAmount(
  amountMinor: number,
  minorUnit: number,
): string {
  const sign = amountMinor < 0 ? '-' : ''
  const absolute = Math.abs(amountMinor)
    .toString()
    .padStart(minorUnit + 1, '0')
  if (minorUnit === 0) return `${sign}${absolute}`
  return `${sign}${absolute.slice(0, -minorUnit)}.${absolute.slice(-minorUnit)}`
}
