import { describe, expect, it } from 'vitest'
import { resolveDashboardRange } from '../dashboard/dashboard-data'
import { resolveTransactionDateRange } from './transaction-filter-data'

describe('ledger date boundaries', () => {
  it('keeps partial custom ledger bounds and rejects incomplete dashboard ranges', () => {
    const midnight = new Date('2025-01-01T00:00:00').getTime() / 1000
    expect(resolveTransactionDateRange('custom', '2025-01-01', '')).toEqual({
      from: midnight,
      to: null,
    })
    expect(resolveTransactionDateRange('custom', '', '2025-01-01')).toEqual({
      from: null,
      to: midnight + 86399,
    })
    expect(resolveDashboardRange('custom', '2025-01-01', '')).toBeNull()
    expect(resolveTransactionDateRange('custom', 'invalid', 'invalid')).toEqual(
      { from: null, to: null },
    )
  })

  it.each([
    '7d',
    '30d',
    '90d',
    'current-month',
    'previous-month',
    'current-year',
  ] as const)('preserves equivalent local bounds for %s', (preset) => {
    const now = new Date(2025, 0, 15, 12)
    const dashboard = resolveDashboardRange(preset, '', '', now)!
    expect(resolveTransactionDateRange(preset, '', '', now)).toEqual({
      from: dashboard.dateFrom,
      to: dashboard.dateTo,
    })
  })

  it('retains the existing fixed-second custom end across a DST boundary', () => {
    const start = new Date('2025-03-30T00:00:00').getTime() / 1000
    expect(
      resolveTransactionDateRange('custom', '2025-03-30', '2025-03-30'),
    ).toEqual({ from: start, to: start + 86399 })
  })
})
