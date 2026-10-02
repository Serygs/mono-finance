export function formatEpochDate(
  epochSeconds: number,
  options: Intl.DateTimeFormatOptions,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, options).format(epochSeconds * 1_000)
}

// These helpers deliberately use local midnight. Range owners retain their
// existing inclusive-end and incomplete-input contracts, including DST behavior.
export function dateInputToLocalEpoch(value: string): number | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.getTime() / 1_000
}

export function localEpoch(year: number, month: number, day: number): number {
  return new Date(year, month, day).getTime() / 1_000
}
