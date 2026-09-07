export interface HistoricalExchangeRate {
  rateAt: number
  rateDenominator: number
  rateNumerator: number
  source: string
  sourceCurrencyCode: string
  targetCurrencyCode: string
}

interface ConvertibleTransaction {
  currencyCode: string
  effectiveAmountMinor: number
  id: string
  originalTimestamp: number
}

interface ConvertedTransaction extends ConvertibleTransaction {
  conversionRateSources: string[]
}

export interface MissingCurrencyRate {
  count: number
  currencyCode: string
}

export function convertTransactionsToBaseCurrency<
  Transaction extends ConvertibleTransaction,
>(
  transactions: Transaction[],
  baseCurrencyCode: string,
  rates: HistoricalExchangeRate[],
): {
  converted: Array<Transaction & ConvertedTransaction>
  missing: MissingCurrencyRate[]
} {
  const missing = new Map<string, number>()
  const converted: Array<Transaction & ConvertedTransaction> = []
  for (const transaction of transactions) {
    const rate = rateFor(
      transaction.currencyCode,
      baseCurrencyCode,
      transaction.originalTimestamp,
      rates,
    )
    if (rate === null) {
      missing.set(
        transaction.currencyCode,
        (missing.get(transaction.currencyCode) ?? 0) + 1,
      )
      continue
    }
    converted.push({
      ...transaction,
      conversionRateSources: rate.sources,
      currencyCode: baseCurrencyCode,
      effectiveAmountMinor: multiplyAndRound(
        transaction.effectiveAmountMinor,
        rate.numerator,
        rate.denominator,
      ),
    })
  }
  return {
    converted,
    missing: [...missing.entries()]
      .map(([currencyCode, count]) => ({ currencyCode, count }))
      .sort((left, right) =>
        left.currencyCode.localeCompare(right.currencyCode),
      ),
  }
}

interface RationalRate {
  denominator: bigint
  numerator: bigint
  sources: string[]
}

function rateFor(
  sourceCurrencyCode: string,
  targetCurrencyCode: string,
  timestamp: number,
  rates: HistoricalExchangeRate[],
): RationalRate | null {
  if (sourceCurrencyCode === targetCurrencyCode) {
    return { denominator: 1n, numerator: 1n, sources: [] }
  }
  const direct = latestRate(
    sourceCurrencyCode,
    targetCurrencyCode,
    timestamp,
    rates,
  )
  if (direct !== null) return direct

  const sourceToUah = rateForDirectOrInverse(
    sourceCurrencyCode,
    'UAH',
    timestamp,
    rates,
  )
  const uahToTarget = rateForDirectOrInverse(
    'UAH',
    targetCurrencyCode,
    timestamp,
    rates,
  )
  if (sourceToUah === null || uahToTarget === null) return null
  return {
    denominator: sourceToUah.denominator * uahToTarget.denominator,
    numerator: sourceToUah.numerator * uahToTarget.numerator,
    sources: sourceToUah.sources.concat(uahToTarget.sources),
  }
}

function rateForDirectOrInverse(
  sourceCurrencyCode: string,
  targetCurrencyCode: string,
  timestamp: number,
  rates: HistoricalExchangeRate[],
): RationalRate | null {
  if (sourceCurrencyCode === targetCurrencyCode) {
    return { denominator: 1n, numerator: 1n, sources: [] }
  }
  const direct = latestRate(
    sourceCurrencyCode,
    targetCurrencyCode,
    timestamp,
    rates,
  )
  if (direct !== null) return direct
  const inverse = latestRate(
    targetCurrencyCode,
    sourceCurrencyCode,
    timestamp,
    rates,
  )
  return inverse === null
    ? null
    : {
        denominator: inverse.numerator,
        numerator: inverse.denominator,
        sources: inverse.sources,
      }
}

function latestRate(
  sourceCurrencyCode: string,
  targetCurrencyCode: string,
  timestamp: number,
  rates: HistoricalExchangeRate[],
): RationalRate | null {
  const value = rates
    .filter(
      (rate) =>
        rate.sourceCurrencyCode === sourceCurrencyCode &&
        rate.targetCurrencyCode === targetCurrencyCode &&
        rate.rateAt <= timestamp,
    )
    .sort(
      (left, right) =>
        right.rateAt - left.rateAt || right.source.localeCompare(left.source),
    )[0]
  return value === undefined
    ? null
    : {
        denominator: BigInt(value.rateDenominator),
        numerator: BigInt(value.rateNumerator),
        sources: [`${value.source}@${value.rateAt}`],
      }
}

function multiplyAndRound(
  amountMinor: number,
  numerator: bigint,
  denominator: bigint,
): number {
  const negative = amountMinor < 0
  const absoluteAmount = BigInt(Math.abs(amountMinor)) * numerator
  const rounded = (absoluteAmount + denominator / 2n) / denominator
  const result = negative ? -rounded : rounded
  if (
    result > BigInt(Number.MAX_SAFE_INTEGER) ||
    result < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new RangeError(
      'Converted amount exceeds the supported integer range.',
    )
  }
  return Number(result)
}
