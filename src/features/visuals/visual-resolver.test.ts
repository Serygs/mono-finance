import { describe, expect, it } from 'vitest'
import { merchantKey, resolveTransactionVisual } from './visual-resolver'

const transaction = {
  originalDescription: 'CHEESE BAKERY 12345',
  category: {
    id: 'restaurants',
    name: 'Restaurants & Fast Food',
    source: 'custom',
  },
} as never
describe('transaction visual resolver', () => {
  it('uses merchant mapping before category mapping and falls back after removal', () => {
    const mappings = {
      merchantVisuals: [
        { key: merchantKey('CHEESE BAKERY'), assetId: 'merchant' },
      ],
      categoryVisuals: [{ key: 'category:restaurants', assetId: 'category' }],
    }
    expect(resolveTransactionVisual(transaction, mappings).assetId).toBe(
      'merchant',
    )
    expect(
      resolveTransactionVisual(transaction, {
        ...mappings,
        merchantVisuals: [],
      }).assetId,
    ).toBe('category')
  })
})
