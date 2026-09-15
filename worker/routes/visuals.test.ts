import { describe, expect, it } from 'vitest'
import { isVisualKey } from './visuals'

describe('visual mapping key validation', () => {
  it('accepts normalized Ukrainian and Latin merchant keys', () => {
    expect(isVisualKey('близенько')).toBe(true)
    expect(isVisualKey('cheese-bakery')).toBe(true)
    expect(isVisualKey('category:restaurants_1')).toBe(true)
  })

  it('rejects unsafe mapping keys', () => {
    expect(isVisualKey('')).toBe(false)
    expect(isVisualKey('../asset')).toBe(false)
    expect(isVisualKey('merchant/key')).toBe(false)
  })
})
