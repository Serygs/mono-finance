import type { CurrencyPreferencesRepository } from '../repositories/currency-preferences-repository'

export class CurrencyPreferencesError extends Error {}

export class CurrencyPreferencesService {
  private readonly repository: CurrencyPreferencesRepository
  private readonly now: () => number

  constructor(
    repository: CurrencyPreferencesRepository,
    now: () => number = () => Math.floor(Date.now() / 1_000),
  ) {
    this.repository = repository
    this.now = now
  }

  get(userId: string): Promise<{ baseCurrencyCode: string }> {
    return this.repository
      .getBaseCurrency(userId)
      .then((baseCurrencyCode) => ({ baseCurrencyCode }))
  }

  async setBaseCurrency(userId: string, baseCurrencyCode: string) {
    if (!/^[A-Z]{3}$/.test(baseCurrencyCode)) {
      throw new CurrencyPreferencesError('Invalid base currency.')
    }
    await this.repository.saveBaseCurrency(userId, baseCurrencyCode, this.now())
    return { baseCurrencyCode }
  }
}
