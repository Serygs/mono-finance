import { resolveCurrency } from '../common/currencies'
import type {
  ExchangeRateSource,
  ExchangeRateSourceRecord,
} from './exchange-rate-source'

const ENDPOINT = 'https://api.monobank.ua/bank/currency'
const SOURCE = 'monobank-public-mid-v1'

export class ExchangeRateSourceError extends Error {}

export class MonobankExchangeRateSource implements ExchangeRateSource {
  private readonly fetcher: typeof fetch
  private readonly timeoutMilliseconds: number

  constructor(fetcher: typeof fetch = fetch, timeoutMilliseconds = 10_000) {
    this.fetcher = fetcher
    this.timeoutMilliseconds = timeoutMilliseconds
  }

  async retrieveLatestRates(): Promise<ExchangeRateSourceRecord[]> {
    const controller = new AbortController()
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMilliseconds,
    )
    try {
      const fetcher = this.fetcher
      const response = await fetcher(
        new Request(ENDPOINT, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }),
      )
      if (!response.ok)
        throw new ExchangeRateSourceError('Rate source unavailable.')
      const payload: unknown = await response.json()
      return parseRates(payload)
    } catch (error) {
      if (error instanceof ExchangeRateSourceError) throw error
      throw new ExchangeRateSourceError('Rate source unavailable.')
    } finally {
      clearTimeout(timeout)
    }
  }
}

function parseRates(payload: unknown): ExchangeRateSourceRecord[] {
  if (!Array.isArray(payload))
    throw new ExchangeRateSourceError('Invalid rate response.')
  return payload.map((value) => {
    const record = object(value)
    const sourceCurrencyNumericCode = numericCode(record['currencyCodeA'])
    const targetCurrencyNumericCode = numericCode(record['currencyCodeB'])
    const rate = decimalRate(record['rateCross'] ?? midpoint(record))
    const sourceCurrency = resolveCurrency(sourceCurrencyNumericCode)
    const targetCurrency = resolveCurrency(targetCurrencyNumericCode)
    return {
      rateAt: integer(record['date']),
      rateDenominator: rate.denominator,
      rateNumerator: rate.numerator,
      source: SOURCE,
      sourceCurrencyCode: sourceCurrency.code,
      sourceCurrencyDisplayName: sourceCurrency.displayName,
      sourceCurrencyMinorUnit: sourceCurrency.minorUnit,
      sourceCurrencyNumericCode,
      targetCurrencyCode: targetCurrency.code,
      targetCurrencyDisplayName: targetCurrency.displayName,
      targetCurrencyMinorUnit: targetCurrency.minorUnit,
      targetCurrencyNumericCode,
    }
  })
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ExchangeRateSourceError('Invalid rate response.')
  }
  return value as Record<string, unknown>
}
function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ExchangeRateSourceError('Invalid rate response.')
  }
  return value
}
function numericCode(value: unknown): string {
  const code = integer(value)
  if (code > 999) throw new ExchangeRateSourceError('Invalid rate response.')
  return code.toString().padStart(3, '0')
}
function midpoint(record: Record<string, unknown>): string {
  const buy = decimalRate(record['rateBuy'])
  const sell = decimalRate(record['rateSell'])
  const numerator =
    buy.numerator * sell.denominator + sell.numerator * buy.denominator
  const denominator = 2 * buy.denominator * sell.denominator
  return `${numerator}/${denominator}`
}
function decimalRate(value: unknown): {
  denominator: number
  numerator: number
} {
  const text =
    typeof value === 'string'
      ? value
      : typeof value === 'number'
        ? String(value)
        : null
  if (text === null) throw new ExchangeRateSourceError('Invalid rate response.')
  const fraction = /^(\d+)(?:\.(\d+))?$/.exec(text)
  if (fraction === null) {
    const rational = /^(\d+)\/(\d+)$/.exec(text)
    if (rational === null)
      throw new ExchangeRateSourceError('Invalid rate response.')
    return reduce(Number(rational[1]), Number(rational[2]))
  }
  const denominator = 10 ** (fraction[2]?.length ?? 0)
  return reduce(Number(`${fraction[1]}${fraction[2] ?? ''}`), denominator)
}
function reduce(numerator: number, denominator: number) {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator <= 0 ||
    denominator <= 0
  ) {
    throw new ExchangeRateSourceError('Invalid rate response.')
  }
  const divisor = gcd(numerator, denominator)
  return { denominator: denominator / divisor, numerator: numerator / divisor }
}
function gcd(left: number, right: number): number {
  let a = left
  let b = right
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}
