export const CATEGORY_DONUT_LIMIT = 10

export function aggregateCategoryDistribution<
  T extends { amountMinor: number },
>(values: readonly T[], createOther: (amountMinor: number) => T): T[] {
  const sorted = [...values].sort(
    (left, right) => right.amountMinor - left.amountMinor,
  )
  if (sorted.length <= CATEGORY_DONUT_LIMIT) return sorted

  const otherAmountMinor = sorted
    .slice(CATEGORY_DONUT_LIMIT)
    .reduce((total, item) => total + item.amountMinor, 0)
  return sorted
    .slice(0, CATEGORY_DONUT_LIMIT)
    .concat(createOther(otherAmountMinor))
}

export function categoryPercentage(amountMinor: number, totalMinor: number) {
  return totalMinor === 0 ? 0 : Math.round((amountMinor / totalMinor) * 100)
}

export function getActiveExpenseCategoryCount(
  values: readonly {
    amountMinor: number
    categoryId: string | null
    categoryName: string
  }[],
) {
  return new Set(
    values
      .filter((item) => item.amountMinor !== 0)
      .map((item) => `${item.categoryId ?? 'source'}:${item.categoryName}`),
  ).size
}
