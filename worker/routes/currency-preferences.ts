import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import {
  CurrencyPreferencesError,
  type CurrencyPreferencesService,
} from '../services/currency-preferences-service'
import type { ExchangeRateService } from '../services/exchange-rate-service'
import { ExchangeRateSourceError } from '../exchange-rates/monobank-exchange-rate-source'

type CurrencyPreferencesContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function getCurrencyPreferencesHandler(
  context: CurrencyPreferencesContext,
  service: CurrencyPreferencesService,
) {
  return noStore(
    context.json(
      success(await service.get(context.get('authenticatedUser').id)),
    ),
  )
}

export async function setCurrencyPreferencesHandler(
  context: CurrencyPreferencesContext,
  service: CurrencyPreferencesService,
) {
  try {
    let input: unknown
    try {
      input = await context.req.raw.json()
    } catch {
      throw new CurrencyPreferencesError('Invalid base currency.')
    }
    const baseCurrencyCode =
      typeof input === 'object' && input !== null && !Array.isArray(input)
        ? (input as Record<string, unknown>)['baseCurrencyCode']
        : undefined
    if (typeof baseCurrencyCode !== 'string')
      throw new CurrencyPreferencesError('Invalid base currency.')
    return noStore(
      context.json(
        success(
          await service.setBaseCurrency(
            context.get('authenticatedUser').id,
            baseCurrencyCode.toUpperCase(),
          ),
        ),
      ),
    )
  } catch (error) {
    if (!(error instanceof CurrencyPreferencesError)) throw error
    return noStore(
      context.json(failure('validation_error', 'Invalid base currency.'), 400),
    )
  }
}

export async function synchronizeExchangeRatesHandler(
  context: CurrencyPreferencesContext,
  service: ExchangeRateService,
) {
  try {
    return noStore(context.json(success(await service.synchronize())))
  } catch (error) {
    if (!(error instanceof ExchangeRateSourceError)) throw error
    return noStore(
      context.json(
        failure(
          'exchange_rates_unavailable',
          'Exchange rates could not be updated. Try again later.',
        ),
        502,
      ),
    )
  }
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
