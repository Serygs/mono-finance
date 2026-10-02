import { describe, expect, it } from 'vitest'
import { formatMoney } from './money-presentation'

describe('exact money presentation', () => {
  it.each(['en-US', 'uk', 'de-DE', 'ar-EG'])(
    'retains Intl placement and signs for %s',
    (locale) => {
      for (const currencyCode of ['UAH', 'USD', 'JPY', 'KWD']) {
        for (const minorUnit of [0, 2, 3]) {
          for (const amountMinor of [-1234567, -1, -0, 0, 1, 1234567]) {
            const expected = new Intl.NumberFormat(locale, {
              style: 'currency',
              currency: currencyCode,
              currencyDisplay: 'code',
              minimumFractionDigits: minorUnit,
              maximumFractionDigits: minorUnit,
            }).format(amountMinor / 10 ** minorUnit)
            expect(
              formatMoney(amountMinor, { locale, currencyCode, minorUnit }),
            ).toBe(expected)
          }
        }
      }
    },
  )

  it('retains all digits beyond Number precision', () => {
    expect(
      formatMoney(900719925474099199n, {
        currencyCode: 'UAH',
        minorUnit: 2,
        locale: 'en-US',
      }),
    ).toBe('UAH 9,007,199,254,740,991.99')
    expect(
      formatMoney(-900719925474099199n, {
        currencyCode: 'KWD',
        minorUnit: 3,
        locale: 'en-US',
        presentation: 'code-suffix',
      }),
    ).toBe('−900,719,925,474,099.199 KWD')
  })

  it('formats signs on sub-unit amounts and zero explicitly', () => {
    expect(
      formatMoney(-1n, { currencyCode: 'UAH', minorUnit: 2, locale: 'en-US' }),
    ).toBe('-UAH 0.01')
    expect(
      formatMoney(1n, {
        currencyCode: 'UAH',
        minorUnit: 2,
        locale: 'en-US',
        signDisplay: 'always',
      }),
    ).toBe('+UAH 0.01')
    expect(
      formatMoney(0n, {
        currencyCode: 'UAH',
        minorUnit: 2,
        locale: 'en-US',
        signDisplay: 'exceptZero',
      }),
    ).toBe('UAH 0.00')
  })

  it('preserves explicit minor units for unknown currency codes', () => {
    expect(
      formatMoney(-125050n, {
        currencyCode: '999',
        minorUnit: 0,
        locale: 'en-US',
      }),
    ).toBe('−125,050 minor units · ISO 999')
  })

  it('rejects precision already lost before presentation', () => {
    expect(() =>
      formatMoney(Number.MAX_SAFE_INTEGER + 1, {
        currencyCode: 'UAH',
        minorUnit: 2,
      }),
    ).toThrow(RangeError)
    expect(() =>
      formatMoney(1.5, { currencyCode: 'UAH', minorUnit: 2 }),
    ).toThrow(RangeError)
  })
})
