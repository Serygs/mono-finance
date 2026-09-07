import { describe, expect, it } from 'vitest'

import { MonobankExchangeRateSource } from './monobank-exchange-rate-source'

describe('MonobankExchangeRateSource', () => {
  it('stores a Monobank public cross rate as an integer rational value', async () => {
    const source = new MonobankExchangeRateSource(async () =>
      Response.json([
        {
          currencyCodeA: 840,
          currencyCodeB: 980,
          date: 1_704_067_200,
          rateCross: 40.125,
        },
      ]),
    )

    await expect(source.retrieveLatestRates()).resolves.toEqual([
      {
        rateAt: 1_704_067_200,
        rateDenominator: 8,
        rateNumerator: 321,
        source: 'monobank-public-mid-v1',
        sourceCurrencyCode: 'USD',
        sourceCurrencyDisplayName: 'US Dollar',
        sourceCurrencyMinorUnit: 2,
        sourceCurrencyNumericCode: '840',
        targetCurrencyCode: 'UAH',
        targetCurrencyDisplayName: 'Ukrainian Hryvnia',
        targetCurrencyMinorUnit: 2,
        targetCurrencyNumericCode: '980',
      },
    ])
  })
})
