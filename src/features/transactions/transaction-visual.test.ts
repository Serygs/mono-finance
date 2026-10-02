import { describe, expect, it } from 'vitest'
import {
  resolveRecentTransactionVisual,
  resolveTransactionCategoryVisual,
} from './transaction-visual'
import type { TransactionListItem } from './transaction-types'

describe('ledger category visual resolution', () => {
  it('gives saved appearance records priority over name inference and falls back for unsupported tokens', () => {
    const transaction = {
      category: { id: 'custom', name: 'Restaurant', source: 'custom' },
    } satisfies Pick<TransactionListItem, 'category'>
    expect(
      resolveRecentTransactionVisual(transaction, [
        { id: 'custom', name: 'Restaurant', icon: 'home', colorToken: 'red' },
      ]),
    ).toEqual({ icon: 'home', colorToken: 'red' })
    expect(
      resolveRecentTransactionVisual(transaction, [
        {
          id: 'custom',
          name: 'Restaurant',
          icon: 'unsupported',
          colorToken: 'unsupported',
        },
      ]),
    ).toEqual({ icon: 'dining', colorToken: null })
    expect(resolveRecentTransactionVisual(transaction, [])).toEqual({
      icon: 'dining',
      colorToken: null,
    })
  })
  it.each([
    ['GROCERIES', 'groceries', 'groceries'],
    ['Продукти', 'groceries', 'groceries'],
    ['Fuel', 'transport', 'transport'],
    ['Restaurant', 'dining', 'dining'],
    ['Subscription', 'entertainment', 'subscriptions'],
    ['Health', 'health', 'health'],
    ['Income', 'wallet', 'transfer'],
    ['Home', 'home', 'housing'],
    ['Unknown custom name', null, 'neutral'],
    [null, null, 'neutral'],
  ])('preserves %s visual identity', (category, icon, tone) => {
    expect(resolveTransactionCategoryVisual(category)).toEqual({ icon, tone })
  })
})
