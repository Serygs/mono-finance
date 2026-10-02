const ISO_ALPHA_CODE = /^[A-Z]{3}$/

interface MoneyPresentation {
  currencyCode: string
  minorUnit: number
  locale?: string
  signDisplay?: Intl.NumberFormatOptions['signDisplay']
  // Accounts historically use a fixed suffix and Unicode minus; other screens
  // use Intl currency placement. Adapters retain those outputs in Phase 1.
  presentation?: 'currency' | 'code-suffix'
}

export function formatMoney(
  amountMinor: number | bigint,
  {
    currencyCode,
    minorUnit,
    locale,
    signDisplay = 'auto',
    presentation = 'currency',
  }: MoneyPresentation,
): string {
  if (typeof amountMinor === 'number' && !Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Money must be a safe integer or bigint.')
  }
  if (!Number.isInteger(minorUnit) || minorUnit < 0 || minorUnit > 20) {
    throw new RangeError('Invalid currency minor unit.')
  }
  const amount = BigInt(amountMinor)
  const absolute = amount < 0n ? -amount : amount
  const integerFormat = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  })
  if (!ISO_ALPHA_CODE.test(currencyCode)) {
    return `${amount < 0n ? '−' : ''}${integerFormat.format(absolute)} minor units · ISO ${currencyCode}`
  }
  const factor = 10n ** BigInt(minorUnit)
  const whole = absolute / factor
  const fraction = (absolute % factor).toString().padStart(minorUnit, '0')
  const digits = new Intl.NumberFormat(locale, { useGrouping: false })
  const localFraction = fraction.replace(/\d/g, (digit) =>
    digits.format(BigInt(digit)),
  )
  if (presentation === 'code-suffix') {
    const decimal =
      new Intl.NumberFormat(locale)
        .formatToParts(1.1)
        .find((part) => part.type === 'decimal')?.value ?? '.'
    const sign =
      amount < 0n
        ? '−'
        : signDisplay === 'always' ||
            (signDisplay === 'exceptZero' && amount !== 0n)
          ? '+'
          : ''
    return `${sign}${integerFormat.format(whole)}${minorUnit === 0 ? '' : decimal + localFraction} ${currencyCode}`
  }
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'code',
    minimumFractionDigits: minorUnit,
    maximumFractionDigits: minorUnit,
    signDisplay,
  })
  // Intl places signs, currency and bidi literals. Replace only the numeric
  // parts using exact bigint division/remainder; never scale through Number.
  const templateValue =
    amount < 0n
      ? -1n
      : amount === 0n
        ? Object.is(amountMinor, -0)
          ? -0
          : 0n
        : 1n
  const template = formatter.formatToParts(templateValue)
  const integer = integerFormat.format(whole)
  let insertedInteger = false
  return template
    .map((part) => {
      if (part.type === 'integer' || part.type === 'group') {
        if (insertedInteger) return ''
        insertedInteger = true
        return integer
      }
      return part.type === 'fraction' ? localFraction : part.value
    })
    .join('')
}
