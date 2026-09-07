import type { MonobankEnvironment } from '../common/environment'
import { D1MonobankRateLimitStore } from '../repositories/monobank-rate-limit-repository'
import { HttpMonobankClient, type MonobankClient } from './client'
import { PersistentMonobankRequestGate } from './rate-limit'

export function createMonobankClient(
  environment: MonobankEnvironment,
): MonobankClient {
  const requestGate = new PersistentMonobankRequestGate(
    new D1MonobankRateLimitStore(environment.DB),
  )
  return new HttpMonobankClient({
    token: environment.MONOBANK_TOKEN,
    requestGate,
  })
}
