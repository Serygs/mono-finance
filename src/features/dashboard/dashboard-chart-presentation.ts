/** Ratios are presentation geometry, calculated from exact integer inputs. */
export function minorRatioPercent(
  amount: number | bigint,
  maximum: number | bigint,
): string {
  const denominator = BigInt(maximum)
  if (denominator <= 0n) return '0'
  const value = BigInt(amount)
  const magnitude = value < 0n ? -value : value
  const hundredths = (magnitude * 10_000n) / denominator
  return `${hundredths / 100n}.${(hundredths % 100n).toString().padStart(2, '0')}`
}

export function shortChartDate(timestamp: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
  }).format(timestamp * 1_000)
}

export function fullChartPeriod(
  start: number,
  end: number,
  locale: string,
): string {
  const format = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return start === end
    ? format.format(start * 1_000)
    : `${format.format(start * 1_000)} – ${format.format(end * 1_000)}`
}
