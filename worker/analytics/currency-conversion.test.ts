import { describe, expect, it } from 'vitest'

import {
  convertTransactionsToBaseCurrency,
  type HistoricalExchangeRate,
} from './currency-conversion'

describe('convertTransactionsToBaseCurrency', () => {
  it('keeps a UAH amount unchanged when UAH is the base currency', () => {
    const result = convertTransactionsToBaseCurrency(
      [transaction('uah', -1_234, 'UAH', 1_704_067_200)],
      'UAH',
      [],
    )

    expect(result.converted).toMatchObject([
      { currencyCode: 'UAH', effectiveAmountMinor: -1_234 },
    ])
    expect(result.missing).toEqual([])
  })

  it('converts USD and EUR using stored historical rates without mixing the original currencies', () => {
    const result = convertTransactionsToBaseCurrency(
      [
        transaction('usd', -1_000, 'USD', 1_704_067_200),
        transaction('eur', -1_000, 'EUR', 1_704_067_200),
      ],
      'UAH',
      [
        rate('USD', 'UAH', 4_000, 100, 1_704_000_000),
        rate('EUR', 'UAH', 4_300, 100, 1_704_000_000),
      ],
    )

    expect(result.converted).toMatchObject([
      { currencyCode: 'UAH', effectiveAmountMinor: -40_000 },
      { currencyCode: 'UAH', effectiveAmountMinor: -43_000 },
    ])
    expect(result.missing).toEqual([])
  })

  it('uses a reproducible cross-rate through UAH for a non-UAH base currency', () => {
    const result = convertTransactionsToBaseCurrency(
      [transaction('eur', -10_000, 'EUR', 1_704_067_200)],
      'USD',
      [
        rate('EUR', 'UAH', 4_300, 100, 1_704_000_000),
        rate('USD', 'UAH', 4_000, 100, 1_704_000_000),
      ],
    )

    expect(result.converted).toMatchObject([
      { currencyCode: 'USD', effectiveAmountMinor: -10_750 },
    ])
  })

  it('does not use a future rate and reports the original currency as missing', () => {
    const result = convertTransactionsToBaseCurrency(
      [transaction('usd', -1_000, 'USD', 1_704_067_200)],
      'UAH',
      [rate('USD', 'UAH', 4_000, 100, 1_704_067_201)],
    )

    expect(result.converted).toEqual([])
    expect(result.missing).toEqual([{ currencyCode: 'USD', count: 1 }])
  })
})

function transaction(
  id: string,
  effectiveAmountMinor: number,
  currencyCode: string,
  originalTimestamp: number,
) {
  return { currencyCode, effectiveAmountMinor, id, originalTimestamp }
}

function rate(
  sourceCurrencyCode: string,
  targetCurrencyCode: string,
  rateNumerator: number,
  rateDenominator: number,
  rateAt: number,
): HistoricalExchangeRate {
  return {
    rateAt,
    rateDenominator,
    rateNumerator,
    source: 'test',
    sourceCurrencyCode,
    targetCurrencyCode,
  }
}
