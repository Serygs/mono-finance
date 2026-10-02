import type { Translate, TranslationKey } from '../localization/localization'
import type { TransactionListItem } from './transaction-types'

const BANK_LABELS: Readonly<Record<string, TranslationKey>> = {
  '5411': 'Groceries',
  '5499': 'Food stores',
  '5812': 'Restaurants',
  '5814': 'Fast food',
  '5541': 'Fuel',
  '5542': 'Fuel',
  '4121': 'Taxi',
  '5912': 'Pharmacies',
  '4900': 'Utilities',
}

export function transactionCategoryLabel(
  category: TransactionListItem['category'],
  t: Translate,
): string {
  return category.source === 'original' &&
    category.id !== null &&
    BANK_LABELS[category.id] !== undefined
    ? t(BANK_LABELS[category.id]!)
    : (category.name ?? t('Uncategorized'))
}
