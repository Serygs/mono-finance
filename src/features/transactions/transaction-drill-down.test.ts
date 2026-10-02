import { describe, expect, it } from 'vitest'
import {
  analyticsTransactionFilters,
  transactionDrillDownUrl,
  transactionFilterParameters,
} from './transaction-drill-down'
import { periodCoverage } from './data-freshness'
const context = {
  accountIds: ['synthetic-account'],
  dateFrom: 100,
  dateTo: 299,
  currencyMode: 'original' as const,
  amountMode: 'effective' as const,
  excluded: false as const,
}
describe('traceable analytics navigation', () => {
  it('preserves exact criteria and identity, independently of display names', () => {
    const filters = analyticsTransactionFilters(context, {
      categoryIdentity: { kind: 'id', id: '5411' },
      direction: 'expense',
      currency: 'USD',
    })!
    const url = new URL(transactionDrillDownUrl(filters), 'http://localhost')
    expect(url.searchParams.getAll('accountId')).toEqual(context.accountIds)
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      dateFrom: '100',
      dateTo: '299',
      categoryId: '5411',
      direction: 'expense',
      currency: 'USD',
      excluded: 'false',
    })
    expect(url.searchParams.has('category')).toBe(false)
    const withLabel = new URL(
      transactionDrillDownUrl(filters, {
        categoryLabel: 'A preserved original name',
      }),
      'http://localhost',
    )
    expect(withLabel.searchParams.get('categoryLabel')).toBe(
      'A preserved original name',
    )
    expect(withLabel.searchParams.get('categoryId')).toBe('5411')
    expect(transactionFilterParameters(filters).has('categoryLabel')).toBe(
      false,
    )
    expect(
      analyticsTransactionFilters(context, { direction: null, currency: null })
        ?.direction,
    ).toBeNull()
    expect(
      analyticsTransactionFilters(
        { ...context, currencyMode: 'base' },
        { direction: 'expense', currency: 'UAH' },
      ),
    ).toBeNull()
  })
})
describe('verified interval coverage', () => {
  const range = { dateFrom: 100, dateTo: 299 }
  const window = (fromEpochSeconds: number, toEpochSeconds: number) => ({
    fromEpochSeconds,
    toEpochSeconds,
    completedAt: 400,
  })
  it('never upgrades unknown history or min/max with a gap to complete', () => {
    expect(periodCoverage(undefined, range)).toBe('unknown')
    expect(periodCoverage([], range)).toBe('unknown')
    expect(periodCoverage([window(100, 199), window(201, 299)], range)).toBe(
      'partial',
    )
    expect(periodCoverage([window(0, 99)], range)).toBe('unknown')
    expect(periodCoverage([window(200, 299), window(100, 199)], range)).toBe(
      'covered',
    )
    expect(periodCoverage([window(90, 220), window(200, 350)], range)).toBe(
      'covered',
    )
  })
})
