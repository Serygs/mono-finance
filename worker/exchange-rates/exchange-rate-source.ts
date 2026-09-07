export interface ExchangeRateSourceRecord {
  rateAt: number
  rateDenominator: number
  rateNumerator: number
  source: string
  sourceCurrencyCode: string
  sourceCurrencyDisplayName: string
  sourceCurrencyMinorUnit: number
  sourceCurrencyNumericCode: string
  targetCurrencyCode: string
  targetCurrencyDisplayName: string
  targetCurrencyMinorUnit: number
  targetCurrencyNumericCode: string
}

export interface ExchangeRateSource {
  retrieveLatestRates(): Promise<ExchangeRateSourceRecord[]>
}
