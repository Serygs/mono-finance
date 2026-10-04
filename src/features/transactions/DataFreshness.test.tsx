import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { accountQueryKeys } from '../accounts/account-queries'
import type { AccountSummary } from '../accounts/account-types'
import { DataFreshness, FreshnessDetails } from './DataFreshness'
import { transactionQueryKeys } from './transaction-queries'
import type { TransactionSyncState } from './transaction-sync-types'

const account: AccountSummary = {
  balanceMinor: 0,
  cards: [],
  creditLimitMinor: null,
  currency: {
    code: 'UAH',
    displayName: 'Hryvnia',
    minorUnit: 2,
    numericCode: '980',
  },
  id: 'account-1',
  isActive: true,
  type: 'black',
}
const state: TransactionSyncState = {
  accountId: account.id,
  accountType: account.type,
  currencyCode: 'UAH',
  coverageIntervals: [
    { fromEpochSeconds: 100, toEpochSeconds: 250, completedAt: 250 },
  ],
  lastErrorCode: null,
  lastSuccessfulSyncAt: 250,
  status: 'idle',
}

describe('freshness messages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(250_000)
  })
  afterEach(() => vi.useRealTimers())

  it('separates elapsed coverage, future intervals, and successful synchronization', () => {
    const markup = renderToStaticMarkup(
      <FreshnessDetails
        accounts={[account]}
        states={[state]}
        range={{ dateFrom: 100, dateTo: 399 }}
      />,
    )
    expect(markup).toContain('Elapsed portion has verified import coverage')
    expect(markup).toContain('Future intervals are not gaps.')
    expect(markup).toContain('Transaction sync succeeded')
    expect(markup).not.toContain('Elapsed portion has unverified gaps')
  })

  it('labels future selections separately from unknown coverage', () => {
    const markup = renderToStaticMarkup(
      <FreshnessDetails
        accounts={[account]}
        states={[]}
        range={{ dateFrom: 251, dateTo: 399 }}
      />,
    )
    expect(markup).toContain('Selected period is in the future')
    expect(markup).not.toContain('History coverage unknown')
  })

  it.each([
    [250, 'idle', false],
    [249, 'idle', true],
    [250, 'failed', true],
  ] as const)(
    'shows a warning for coverage ending at %i with status %s: %s',
    (end, status, warning) => {
      const client = new QueryClient()
      client.setQueryData(accountQueryKeys.all, [account])
      client.setQueryData(transactionQueryKeys.syncStatus, [
        {
          ...state,
          status,
          coverageIntervals: [
            { fromEpochSeconds: 100, toEpochSeconds: end, completedAt: 250 },
          ],
        },
      ])
      try {
        const markup = renderToStaticMarkup(
          <QueryClientProvider client={client}>
            <DataFreshness
              accountIds={[]}
              range={{ dateFrom: 100, dateTo: 399 }}
            />
          </QueryClientProvider>,
        )
        expect(markup.includes('role="status"')).toBe(warning)
        if (status === 'failed') expect(markup).toContain('Sync needs retry')
        else if (warning) {
          expect(markup).toContain('Elapsed portion has unverified gaps')
          expect(markup).toContain('Import gaps')
          expect(markup).toContain('data-freshness--warning')
        }
      } finally {
        client.clear()
      }
    },
  )

  it('keeps unknown coverage distinct from a verified import gap and ignores unselected failures', () => {
    const client = new QueryClient()
    client.setQueryData(accountQueryKeys.all, [account])
    client.setQueryData(transactionQueryKeys.syncStatus, [
      { ...state, coverageIntervals: undefined },
      { ...state, accountId: 'unselected', status: 'failed' },
    ])
    try {
      const markup = renderToStaticMarkup(
        <QueryClientProvider client={client}>
          <DataFreshness
            accountIds={[account.id]}
            range={{ dateFrom: 100, dateTo: 399 }}
          />
        </QueryClientProvider>,
      )
      expect(markup).not.toContain('Import gaps')
      expect(markup).not.toContain('Sync needs retry')
      expect(markup).not.toContain('role="status"')
    } finally {
      client.clear()
    }
  })
})
