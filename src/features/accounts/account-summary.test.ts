import { describe, expect, it } from 'vitest'

import { summarizeCurrencyBalances } from './account-summary'

describe('account currency summary', () => {
  it('groups balances by original currency without converting them', () => {
    const balances = summarizeCurrencyBalances([
      account({ balanceMinor: 1_250, id: 'uah-1' }),
      account({ balanceMinor: 750, id: 'uah-2' }),
      account({
        balanceMinor: 2_500,
        code: 'EUR',
        displayName: 'Euro',
        id: 'eur-1',
      }),
    ])

    expect(balances).toEqual([
      expect.objectContaining({
        accountCount: 2,
        balanceMinor: 2_000n,
        code: 'UAH',
      }),
      expect.objectContaining({
        accountCount: 1,
        balanceMinor: 2_500n,
        code: 'EUR',
      }),
    ])
  })
})

function account({
  balanceMinor,
  code = 'UAH',
  displayName = 'Ukrainian hryvnia',
  id,
}: {
  balanceMinor: number
  code?: string
  displayName?: string
  id: string
}) {
  return {
    balanceMinor,
    cards: [],
    creditLimitMinor: null,
    currency: {
      code,
      displayName,
      minorUnit: 2,
      numericCode: code === 'UAH' ? '980' : '978',
    },
    id,
    isActive: true,
    type: 'black',
  }
}
