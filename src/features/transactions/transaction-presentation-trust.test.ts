import { describe, expect, it } from 'vitest'
import { accountLabel } from './transaction-formatting'
import { transactionCategoryLabel } from './transaction-category-presentation'
import {
  accountDisplayLabel,
  compactCardNumber,
} from '../accounts/account-formatting'
import type { Translate } from '../localization/localization'

const t: Translate = (key) => key

describe('ordinary financial labels', () => {
  it('retains real differentiators without exposing technical IDs', () => {
    const account = {
      id: '00000000-0000-4000-8000-000000000001',
      type: '',
      maskedPan: null,
    }
    expect(accountLabel({ account, currencyCode: 'USD' }, 'Account')).toBe(
      'Account · USD',
    )
    expect(
      accountLabel(
        {
          account: { ...account, type: 'white', maskedPan: '123456******9012' },
          currencyCode: 'UAH',
        },
        'Рахунок',
      ),
    ).toBe('White · •••• 9012 · UAH')
    expect(
      accountDisplayLabel(
        { type: ' ', currencyCode: 'EUR', maskedPan: '' },
        'Рахунок',
      ),
    ).toBe('Рахунок · EUR')
    expect(compactCardNumber('****')).toBeNull()
  })
  it('shortens only explicit bank identities and keeps user-owned names', () => {
    expect(
      transactionCategoryLabel(
        { id: '5411', name: 'Long bank name', source: 'original' },
        t,
      ),
    ).toBe('Groceries')
    for (const source of ['custom', 'mapped'] as const)
      expect(
        transactionCategoryLabel(
          { id: '5411', name: 'My category', source },
          t,
        ),
      ).toBe('My category')
    expect(
      transactionCategoryLabel(
        {
          id: '9999',
          name: 'Insurance and other services',
          source: 'original',
        },
        t,
      ),
    ).toBe('Insurance and other services')
    expect(
      transactionCategoryLabel({ id: null, name: null, source: null }, t),
    ).toBe('Uncategorized')
  })
})
