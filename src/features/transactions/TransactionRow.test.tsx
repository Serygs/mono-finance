import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TransactionRow } from './TransactionRow'
import type { TransactionListItem } from './transaction-types'

const transaction: TransactionListItem = {
  account: { id: 'account-1', maskedPan: null, type: 'black' },
  adjustmentNote: null,
  category: { id: 'category-dining', name: 'Dining', source: 'custom' },
  originalCategory: { id: '5812', name: 'Restaurant services' },
  currencyCode: 'UAH',
  currencyMinorUnit: 2,
  effectiveAmountMinor: -4000,
  exclusionReason: null,
  hasAdjustment: false,
  hasCompensation: false,
  id: 'expense-1',
  isExcluded: false,
  originalAmountMinor: -4000,
  originalDescription: 'Restaurant',
  originalMcc: 5812,
  originalTimestamp: 1735689600,
}

function renderCategory(category: TransactionListItem['category']) {
  return renderToStaticMarkup(
    <TransactionRow
      transaction={{ ...transaction, category }}
      selected={false}
      onSelect={() => undefined}
      categories={[]}
    />,
  )
}

describe('transaction row category accessibility', () => {
  it.each(['custom', 'mapped', 'original'] as const)(
    'renders an unchanged %s category label once for sighted and screen-reader users',
    (source) => {
      const markup = renderCategory({
        id: 'category-dining',
        name: 'Dining',
        source,
      })
      expect(markup.match(/Dining/gu)).toHaveLength(1)
      expect(markup).toContain(
        '<span class="transactions-ledger-row__category">Dining</span>',
      )
      expect(markup).not.toContain('class="sr-only"')
    },
  )

  it('keeps the full bank category accessible when its visible name is shortened', () => {
    const markup = renderCategory({
      id: '5812',
      name: 'Restaurant services',
      source: 'original',
    })
    expect(markup).toContain('<span aria-hidden="true">Restaurants</span>')
    expect(markup).toContain('<span class="sr-only">Restaurant services</span>')
  })

  it('renders the uncategorized fallback once', () => {
    const markup = renderCategory({ id: null, name: null, source: null })
    expect(markup.match(/Uncategorized/gu)).toHaveLength(1)
    expect(markup).not.toContain('class="sr-only"')
  })
})
