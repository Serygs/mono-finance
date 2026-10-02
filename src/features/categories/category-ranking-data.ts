import type { AnalyticsBreakdowns } from '../dashboard/analytics-api'

type CategoryAmount = AnalyticsBreakdowns['expensesByCategory'][number]
export type RankedCategory = Omit<CategoryAmount, 'amountMinor'> & {
  amountMinor: bigint
  key: string
}

/** Presentation magnitudes only; never combine currencies or rewrite API values. */
export function categoryRankings(values: readonly CategoryAmount[]) {
  const currencies = new Map<string, RankedCategory[]>()
  for (const value of values) {
    const amount = BigInt(value.amountMinor)
    const row = {
      ...value,
      amountMinor: amount < 0n ? -amount : amount,
      key: `${value.currencyCode}:${value.categoryId ?? value.categoryName}`,
    }
    const rows = currencies.get(value.currencyCode) ?? []
    rows.push(row)
    currencies.set(value.currencyCode, rows)
  }
  return [...currencies]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currencyCode, rows]) => {
      const all = [...rows].sort((left, right) =>
        left.amountMinor === right.amountMinor
          ? left.key.localeCompare(right.key)
          : left.amountMinor > right.amountMinor
            ? -1
            : 1,
      )
      return {
        currencyCode,
        all,
        leading: all.slice(0, 5),
        other: all.slice(5).reduce((sum, item) => sum + item.amountMinor, 0n),
        total: all.reduce((sum, item) => sum + item.amountMinor, 0n),
      }
    })
}

const DEFAULT_COLORS = [
  'blue',
  'mint',
  'orange',
  'purple',
  'pink',
  'cyan',
  'red',
  'slate',
] as const
export function categoryDefaultColor(identity: string) {
  let hash = 2_166_136_261
  for (const character of identity)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619)
  return DEFAULT_COLORS[(hash >>> 0) % DEFAULT_COLORS.length]!
}
