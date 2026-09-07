import type { MonobankEnvironment } from '../common/environment'
import { D1CurrencyPreferencesRepository } from '../repositories/currency-preferences-repository'
import { CurrencyPreferencesService } from './currency-preferences-service'

export function createCurrencyPreferencesService(
  environment: MonobankEnvironment,
) {
  return new CurrencyPreferencesService(
    new D1CurrencyPreferencesRepository(environment.DB),
  )
}
