export interface CurrencyDefinition {
  code: string
  displayName: string
  minorUnit: number
  numericCode: string
}

const KNOWN_CURRENCIES: Readonly<
  Record<string, Omit<CurrencyDefinition, 'numericCode'>>
> = {
  '036': { code: 'AUD', displayName: 'Australian Dollar', minorUnit: 2 },
  '124': { code: 'CAD', displayName: 'Canadian Dollar', minorUnit: 2 },
  '156': { code: 'CNY', displayName: 'Chinese Yuan', minorUnit: 2 },
  '203': { code: 'CZK', displayName: 'Czech Koruna', minorUnit: 2 },
  '208': { code: 'DKK', displayName: 'Danish Krone', minorUnit: 2 },
  '348': { code: 'HUF', displayName: 'Hungarian Forint', minorUnit: 2 },
  '392': { code: 'JPY', displayName: 'Japanese Yen', minorUnit: 0 },
  '578': { code: 'NOK', displayName: 'Norwegian Krone', minorUnit: 2 },
  '752': { code: 'SEK', displayName: 'Swedish Krona', minorUnit: 2 },
  '756': { code: 'CHF', displayName: 'Swiss Franc', minorUnit: 2 },
  '826': { code: 'GBP', displayName: 'British Pound', minorUnit: 2 },
  '840': { code: 'USD', displayName: 'US Dollar', minorUnit: 2 },
  '949': { code: 'TRY', displayName: 'Turkish Lira', minorUnit: 2 },
  '978': { code: 'EUR', displayName: 'Euro', minorUnit: 2 },
  '980': { code: 'UAH', displayName: 'Ukrainian Hryvnia', minorUnit: 2 },
  '981': { code: 'GEL', displayName: 'Georgian Lari', minorUnit: 2 },
  '985': { code: 'PLN', displayName: 'Polish Zloty', minorUnit: 2 },
}

export function resolveCurrency(numericCode: string): CurrencyDefinition {
  const known = KNOWN_CURRENCIES[numericCode]
  if (known !== undefined) {
    return { ...known, numericCode }
  }

  return {
    code: numericCode,
    displayName: `ISO 4217 currency ${numericCode}`,
    minorUnit: 0,
    numericCode,
  }
}
