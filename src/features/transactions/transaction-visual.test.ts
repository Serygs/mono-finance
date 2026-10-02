import { describe, expect, it } from 'vitest'
import { resolveTransactionCategoryVisual } from './transaction-visual'

describe('ledger category visual resolution', () => {
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
