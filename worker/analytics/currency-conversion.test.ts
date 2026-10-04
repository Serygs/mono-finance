import { describe, expect, it } from 'vitest'

import {
  convertTransactionsToBaseCurrency,
  type HistoricalExchangeRate,
} from './currency-conversion'

describe('convertTransactionsToBaseCurrency', () => {
  it.each([
    [5_000, 200_000],
    [10_000, 400_000],
  ])(
    'converts compensation %i with the expense rate',
    (compensation, expected) => {
      const original = {
        ...transaction('usd', -10_000, 'USD', 1_704_067_200),
        compensationAmountMinor: compensation,
        originalAmountMinor: -10_000,
      }
      const result = convertTransactionsToBaseCurrency([original], 'UAH', [
        rate('USD', 'UAH', 40, 1, 1_704_000_000),
      ])
      expect(result.converted).toMatchObject([
        {
          compensationAmountMinor: expected,
          effectiveAmountMinor: -400_000,
          originalAmountMinor: -10_000,
          originalTimestamp: original.originalTimestamp,
        },
      ])
      expect(original.compensationAmountMinor).toBe(compensation)
      expect(original.currencyCode).toBe('USD')
    },
  )

  it.each([
    [1, 2, -3, 1, -2, 1],
    [1, 3, -4, 1, -1, 0],
    [2, 3, -4, 2, -3, 1],
  ])(
    'rounds amounts and compensation with rational rate %i/%i',
    (
      numerator,
      denominator,
      amount,
      compensation,
      expectedAmount,
      expectedCompensation,
    ) => {
      const result = convertTransactionsToBaseCurrency(
        [
          {
            ...transaction('usd', amount, 'USD', 1_704_067_200),
            compensationAmountMinor: compensation,
          },
        ],
        'UAH',
        [rate('USD', 'UAH', numerator, denominator, 1_704_000_000)],
      )
      expect(result.converted).toMatchObject([
        {
          compensationAmountMinor: expectedCompensation,
          effectiveAmountMinor: expectedAmount,
        },
      ])
    },
  )

  it('keeps a UAH amount unchanged when UAH is the base currency', () => {
    const result = convertTransactionsToBaseCurrency(
      [
        {
          ...transaction('uah', -1_234, 'UAH', 1_704_067_200),
          compensationAmountMinor: 617,
        },
      ],
      'UAH',
      [],
    )

    expect(result.converted).toMatchObject([
      {
        compensationAmountMinor: 617,
        currencyCode: 'UAH',
        effectiveAmountMinor: -1_234,
      },
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
      [
        {
          ...transaction('eur', -10_000, 'EUR', 1_704_067_200),
          compensationAmountMinor: 5_000,
        },
      ],
      'USD',
      [
        rate('EUR', 'UAH', 4_300, 100, 1_704_000_000),
        rate('USD', 'UAH', 4_000, 100, 1_704_000_000),
      ],
    )

    expect(result.converted).toMatchObject([
      {
        compensationAmountMinor: 5_375,
        currencyCode: 'USD',
        effectiveAmountMinor: -10_750,
      },
    ])
  })

  it.each(['effectiveAmountMinor', 'compensationAmountMinor'] as const)(
    'rejects an unsafe converted %s instead of returning an imprecise number',
    (field) => {
      expect(() =>
        convertTransactionsToBaseCurrency(
          [
            {
              ...transaction('usd', 0, 'USD', 1_704_067_200),
              [field]: Number.MAX_SAFE_INTEGER,
            },
          ],
          'UAH',
          [rate('USD', 'UAH', 2, 1, 1_704_000_000)],
        ),
      ).toThrow(RangeError)
    },
  )

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
  return {
    compensationAmountMinor: 0,
    currencyCode,
    effectiveAmountMinor,
    id,
    originalTimestamp,
  }
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
