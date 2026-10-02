import type { AnalyticsBreakdowns } from '../dashboard/analytics-api'

type ExpenseCategory = AnalyticsBreakdowns['expensesByCategory'][number]

export function displayExpenseCategories(
  values: readonly ExpenseCategory[],
  otherCategoryName: string,
): { all: ExpenseCategory[]; initial: ExpenseCategory[] } {
  const all = [...values].sort(
    (left, right) => right.amountMinor - left.amountMinor,
  )
  const topCategories = all.slice(0, 5)
  const remainingCategories = all.slice(5)

  if (remainingCategories.length === 0) {
    return { all, initial: topCategories }
  }
  const firstRemainingCategory = remainingCategories[0]
  if (firstRemainingCategory === undefined) {
    return { all, initial: topCategories }
  }

  return {
    all,
    initial: topCategories.concat({
      amountMinor: remainingCategories.reduce(
        (total, category) => total + category.amountMinor,
        0,
      ),
      categoryId: null,
      categoryName: otherCategoryName,
      currencyCode: firstRemainingCategory.currencyCode,
    }),
  }
}
