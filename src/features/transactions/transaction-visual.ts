import type { CustomCategory } from '../categories/categories-api'
import { resolveCategoryAppearance } from '../categories/category-appearance'
import type { TransactionListItem } from './transaction-types'

export function resolveRecentTransactionVisual(
  transaction: Pick<TransactionListItem, 'category'>,
  categories: CustomCategory[],
) {
  const custom = resolveCategoryAppearance(
    categories.find((category) => category.id === transaction.category.id),
  )
  const inferred = resolveTransactionCategoryVisual(transaction.category.name)
  return { icon: custom.icon ?? inferred.icon, colorToken: custom.colorToken }
}

export function resolveTransactionCategoryVisual(category: string | null): {
  icon: string | null
  tone: string
} {
  const normalized = category?.toLocaleLowerCase() ?? ''
  if (/grocer|продукт/.test(normalized)) {
    return { icon: 'groceries', tone: 'groceries' }
  }
  if (/fuel|gas|transport|палив|транспорт/.test(normalized)) {
    return { icon: 'transport', tone: 'transport' }
  }
  if (/housing|home|rent|житл|дім/.test(normalized)) {
    return { icon: 'home', tone: 'housing' }
  }
  if (/restaurant|dining|cafe|food|ресторан|кафе/.test(normalized)) {
    return { icon: 'dining', tone: 'dining' }
  }
  if (/subscription|entertainment|підпис|розваг/.test(normalized)) {
    return { icon: 'entertainment', tone: 'subscriptions' }
  }
  if (/health|medical|здоров/.test(normalized)) {
    return { icon: 'health', tone: 'health' }
  }
  if (/transfer|income|переказ|дохід/.test(normalized)) {
    return { icon: 'wallet', tone: 'transfer' }
  }
  return { icon: null, tone: 'neutral' }
}
