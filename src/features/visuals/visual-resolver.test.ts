import { describe, expect, it } from 'vitest'
import type { TransactionListItem } from '../transactions/transaction-types'
import {
  merchantKey,
  resolveDefaultVisual,
  resolveTransactionVisual,
} from './visual-resolver'

const transaction = {
  account: { id: 'account-1', maskedPan: null, type: 'black' },
  adjustmentNote: null,
  originalDescription: 'CHEESE BAKERY 12345',
  category: {
    colorToken: null,
    id: 'restaurants',
    icon: null,
    name: 'Restaurants & Fast Food',
    source: 'custom',
  },
  currencyCode: 'UAH',
  currencyMinorUnit: 2,
  effectiveAmountMinor: -1_000,
  exclusionReason: null,
  hasAdjustment: false,
  hasCompensation: false,
  id: 'transaction-1',
  isExcluded: false,
  originalAmountMinor: -1_000,
  originalCategory: { id: '5812', name: 'Restaurants' },
  originalMcc: 5812,
  originalTimestamp: 1_700_000_000,
} satisfies TransactionListItem

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

  it('maps common English and Ukrainian category meanings to semantic visuals', () => {
    expect(
      resolveDefaultVisual({ categoryName: 'Groceries', fallbackKey: 'one' }),
    ).toMatchObject({ builtIn: 'groceries', colorToken: 'mint' })
    expect(
      resolveDefaultVisual({
        categoryName: 'Аптеки та ліки',
        fallbackKey: 'two',
      }),
    ).toMatchObject({ builtIn: 'health', colorToken: 'red' })
    expect(
      resolveDefaultVisual({
        categoryName: 'Комунальні рахунки',
        fallbackKey: 'three',
      }),
    ).toMatchObject({ builtIn: 'utilities', colorToken: 'orange' })
  })

  it('uses imported MCC meaning when category names are not descriptive', () => {
    expect(
      resolveDefaultVisual({
        categoryName: 'Other',
        fallbackKey: 'mcc-5541',
        originalMcc: 5541,
      }),
    ).toMatchObject({ builtIn: 'fuel', colorToken: 'orange' })
  })

  it('keeps custom category appearance ahead of automatic defaults', () => {
    expect(
      resolveTransactionVisual({
        ...transaction,
        category: {
          ...transaction.category,
          colorToken: 'cyan',
          icon: 'transfer',
        },
      }),
    ).toMatchObject({ builtIn: 'transfer', colorToken: 'cyan' })
  })

  it('derives a stable, colored monogram fallback from its key', () => {
    const first = resolveDefaultVisual({
      categoryName: 'Miscellaneous',
      fallbackKey: 'source:unknown-one',
      monogramSource: 'Corner shop',
    })
    const repeated = resolveDefaultVisual({
      categoryName: 'Miscellaneous',
      fallbackKey: 'source:unknown-one',
      monogramSource: 'Corner shop',
    })
    const different = resolveDefaultVisual({
      categoryName: 'Miscellaneous',
      fallbackKey: 'source:unknown-two',
      monogramSource: 'Workshop',
    })

    expect(first).toEqual(repeated)
    expect(first).toMatchObject({ builtIn: null, monogram: 'C' })
    expect(first.colorToken).not.toBe('slate')
    expect(different.colorToken).not.toBe(first.colorToken)
  })
})
