import type { TransactionSyncState } from './transaction-sync-types'

export function periodCoverage(
  intervals: TransactionSyncState['coverageIntervals'],
  range: { dateFrom: number; dateTo: number } | null,
  now = Math.floor(Date.now() / 1_000),
): 'unknown' | 'partial' | 'covered' | 'future' {
  if (range === null) return 'unknown'
  if (range.dateFrom > now) return 'future'
  if (!intervals?.length) return 'unknown'
  const elapsedEnd = Math.min(range.dateTo, now)
  const sorted = [...intervals].sort(
    (a, b) => a.fromEpochSeconds - b.fromEpochSeconds,
  )
  let next = range.dateFrom
  let intersects = false
  for (const interval of sorted) {
    if (
      interval.toEpochSeconds < range.dateFrom ||
      interval.fromEpochSeconds > elapsedEnd
    )
      continue
    intersects = true
    if (interval.fromEpochSeconds > next) return 'partial'
    next = Math.max(next, interval.toEpochSeconds + 1)
    if (next > elapsedEnd) return 'covered'
  }
  return intersects ? 'partial' : 'unknown'
}
