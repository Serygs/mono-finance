import { MonobankExchangeRateSource } from '../exchange-rates/monobank-exchange-rate-source'
import { D1ExchangeRatesRepository } from '../repositories/exchange-rates-repository'
import type { MonobankEnvironment } from '../common/environment'
import { ExchangeRateService } from './exchange-rate-service'

export function createExchangeRateService(environment: MonobankEnvironment) {
  return new ExchangeRateService(
    new D1ExchangeRatesRepository(environment.DB),
    new MonobankExchangeRateSource(),
  )
}
