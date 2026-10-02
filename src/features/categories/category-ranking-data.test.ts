import { describe, expect, it } from 'vitest'
import { categoryRankings, categoryDefaultColor } from './category-ranking-data'

const category = (
  amountMinor: number,
  index: number,
  currencyCode = 'UAH',
) => ({
  amountMinor,
  categoryId: `id-${index}`,
  categoryName: `Category ${index}`,
  currencyCode,
})

describe('category ranking presentation', () => {
  it('ranks magnitudes, groups only the remainder, and preserves exact totals beyond safe Number sums', () => {
    const values = [
      category(-Number.MAX_SAFE_INTEGER, 0),
      ...Array.from({ length: 6 }, (_, index) =>
        category(-(index + 1), index + 1),
      ),
    ]
    const original = structuredClone(values)
    const [group] = categoryRankings(values)
    expect(group!.total).toBe(9007199254741012n)
    expect(group!.leading.map((row) => row.amountMinor)).toEqual([
      9007199254740991n,
      6n,
      5n,
      4n,
      3n,
    ])
    expect(group!.other).toBe(3n)
    expect(
      group!.leading.reduce((sum, row) => sum + row.amountMinor, 0n) +
        group!.other,
    ).toBe(group!.total)
    expect(values).toEqual(original)
  })
  it('keeps currencies separate, preserves zero rows and deterministic identities', () => {
    const groups = categoryRankings([
      category(100, 1),
      category(100, 1, 'USD'),
      category(0, 2),
    ])
    expect(groups.map((group) => [group.currencyCode, group.total])).toEqual([
      ['UAH', 100n],
      ['USD', 100n],
    ])
    expect(groups[0]!.all[1]!.amountMinor).toBe(0n)
    expect(groups[0]!.all[0]!.key).not.toBe(groups[1]!.all[0]!.key)
    expect(categoryRankings([])).toEqual([])
  })
  it('uses stable colors independent of sorting and direction', () => {
    const identity = 'mcc-5812'
    expect(categoryDefaultColor(identity)).toBe(categoryDefaultColor(identity))
    expect(
      new Set(
        Array.from({ length: 8 }, (_, index) =>
          categoryDefaultColor(`id-${index}`),
        ),
      ).size,
    ).toBeGreaterThan(4)
  })
})
