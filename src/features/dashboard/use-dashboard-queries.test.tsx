import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dashboardQueryKeys } from './dashboard-query-keys'
import { useDashboardQueries } from './use-dashboard-queries'

const { queries, getTransactions } = vi.hoisted(() => ({
  queries: [] as Array<{
    enabled?: boolean
    queryFn: () => Promise<unknown>
    queryKey: readonly unknown[]
  }>,
  getTransactions: vi
    .fn()
    .mockResolvedValue({ nextCursor: null, transactions: [] }),
}))
vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: (typeof queries)[number]) => {
    queries.push(options)
    return { data: { baseCurrencyCode: 'UAH' } }
  },
}))
vi.mock('../transactions/transactions-api', () => ({ getTransactions }))

function render(filters: Parameters<typeof useDashboardQueries>[0]) {
  function Probe(): ReactNode {
    useDashboardQueries(filters)
    return null
  }
  renderToStaticMarkup(<Probe />)
}

const filters = {
  accountIds: ['account-1'],
  range: { dateFrom: 100, dateTo: 200 },
  mode: 'original' as const,
  currency: 'USD',
}

beforeEach(() => {
  queries.length = 0
  getTransactions.mockClear()
})

describe('dashboard record queries', () => {
  it('requests corrections and compensations independently with the active filters and a five-record bound', async () => {
    render(filters)
    for (const query of queries.filter(
      (item) => item.queryKey[0] === 'dashboard-recent',
    ))
      await query.queryFn()
    const expected = {
      accountIds: ['account-1'],
      category: null,
      currency: 'USD',
      dateFrom: 100,
      dateTo: 200,
      direction: null,
      excluded: false,
      search: null,
    }
    expect(getTransactions.mock.calls).toEqual([
      [expected, undefined, 100],
      [{ ...expected, hasAdjustment: true }, undefined, 5],
      [{ ...expected, hasCompensation: true }, undefined, 5],
    ])
    expect(queries.at(-2)?.queryKey).toEqual(
      dashboardQueryKeys.correctionsFor(expected),
    )
    expect(queries.at(-1)?.queryKey).toEqual(
      dashboardQueryKeys.compensationsFor(expected),
    )
  })

  it('keeps query identities unchanged when dashboard presentation rerenders with equivalent filters', () => {
    render(filters)
    const before = queries.map((query) => query.queryKey)
    queries.length = 0
    render({
      ...filters,
      accountIds: [...filters.accountIds],
      range: { ...filters.range },
    })
    expect(queries.map((query) => query.queryKey)).toEqual(before)
  })

  it('disables financial requests when the period is incomplete', () => {
    render({ ...filters, range: null })
    expect(queries.slice(1).every((query) => query.enabled === false)).toBe(
      true,
    )
  })

  it('retains original-currency records when analytics are converted to base currency', async () => {
    render({ ...filters, mode: 'base' })
    await queries.at(-1)!.queryFn()
    expect(getTransactions).toHaveBeenCalledWith(
      expect.objectContaining({ currency: null, hasCompensation: true }),
      undefined,
      5,
    )
  })
})
