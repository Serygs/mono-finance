import type { TransactionSyncState } from './transaction-sync-types'

export function periodCoverage(
  intervals: TransactionSyncState['coverageIntervals'],
  range: { dateFrom: number; dateTo: number } | null,
): 'unknown' | 'partial' | 'covered' {
  if (range === null || !intervals?.length) return 'unknown'
  const sorted = [...intervals].sort(
    (a, b) => a.fromEpochSeconds - b.fromEpochSeconds,
  )
  let next = range.dateFrom
  let intersects = false
  for (const interval of sorted) {
    if (
      interval.toEpochSeconds < range.dateFrom ||
      interval.fromEpochSeconds > range.dateTo
    )
      continue
    intersects = true
    if (interval.fromEpochSeconds > next) return 'partial'
    next = Math.max(next, interval.toEpochSeconds + 1)
    if (next > range.dateTo) return 'covered'
  }
  return intersects ? 'partial' : 'unknown'
}
