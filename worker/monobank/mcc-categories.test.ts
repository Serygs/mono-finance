import { describe, expect, it } from 'vitest'

import { MCC_CATEGORY_NAMES, resolveMccCategoryName } from './mcc-categories'

describe('MCC category names', () => {
  it('maps configured MCCs to Ukrainian category names', () => {
    expect(Object.keys(MCC_CATEGORY_NAMES)).toHaveLength(318)
    expect(MCC_CATEGORY_NAMES).toMatchObject({
      3000: 'Авіалінії, авіакомпанії',
      4829: 'Грошові перекази',
      5732: 'Продаж електронного обладнання',
      5812: 'Місця громадського харчування, ресторани',
      8062: 'Лікарні',
      9406: 'Державні лотереї (крім США)',
    })
  })

  it('keeps the raw MCC fallback for an unknown code', () => {
    expect(resolveMccCategoryName(9998)).toBe('MCC 9998')
  })

  it('resolves extended MCC values, including codes with leading zeroes', () => {
    expect(resolveMccCategoryName(742)).toBe('Ветеринарні послуги')
    expect(resolveMccCategoryName(4215)).toBe(
      "Услуги кур'єра – по повітрю та на землі, агентство з відправлення вантажів",
    )
    expect(resolveMccCategoryName(9950)).toBe('Покупки всередині компанії')
  })
})
