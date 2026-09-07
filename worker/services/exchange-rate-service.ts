import type { ExchangeRateSource } from '../exchange-rates/exchange-rate-source'
import type { ExchangeRatesRepository } from '../repositories/exchange-rates-repository'

export class ExchangeRateService {
  private readonly repository: ExchangeRatesRepository
  private readonly source: ExchangeRateSource

  constructor(repository: ExchangeRatesRepository, source: ExchangeRateSource) {
    this.repository = repository
    this.source = source
  }

  async synchronize(): Promise<{ importedRateCount: number }> {
    const rates = await this.source.retrieveLatestRates()
    await this.repository.upsert(rates)
    return { importedRateCount: rates.length }
  }
}
