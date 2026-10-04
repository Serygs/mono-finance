import { QueryClient } from '@tanstack/react-query'
import { expect, it } from 'vitest'
import {
  refreshCompensationDetails,
  refreshTransactionLedger,
  transactionQueryKeys,
} from './transaction-queries'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'

it('invalidates ledger, recent rows and the analytics shared by Overview/categories without unrelated refetches', async () => {
  const client = new QueryClient()
  const affected = [
    transactionQueryKeys.all,
    dashboardQueryKeys.recent,
    dashboardQueryKeys.correctionsFor({
      accountIds: [],
      category: null,
      currency: null,
      dateFrom: 100,
      dateTo: 200,
      direction: null,
      excluded: false,
      search: null,
    }),
    dashboardQueryKeys.compensationsFor({
      accountIds: [],
      category: null,
      currency: null,
      dateFrom: 100,
      dateTo: 200,
      direction: null,
      excluded: false,
      search: null,
    }),
    dashboardQueryKeys.analytics,
  ]
  for (const key of [
    ...affected,
    ['accounts'],
    ['categories'],
    transactionQueryKeys.compensations('expense'),
  ])
    client.setQueryData(key, {})
  await refreshTransactionLedger(client)
  for (const key of affected)
    expect(client.getQueryState(key)?.isInvalidated).toBe(true)
  for (const key of [
    ['accounts'],
    ['categories'],
    transactionQueryKeys.compensations('expense'),
  ])
    expect(client.getQueryState(key)?.isInvalidated).toBe(false)
  await refreshCompensationDetails(client, 'expense')
  expect(
    client.getQueryState(transactionQueryKeys.compensations('expense'))
      ?.isInvalidated,
  ).toBe(true)
  client.clear()
})
