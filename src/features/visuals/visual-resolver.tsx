/* eslint-disable react-refresh/only-export-components -- pure visual resolver and its small presentational component share one contract. */
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import type { TransactionListItem } from '../transactions/transaction-types'
import type { VisualMappings } from './visuals-api'

export function merchantKey(value: string): string {
  return (
    value
      .normalize('NFKD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase()
      .replace(/\b\d{3,}\b/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, '-') || 'merchant'
  )
}
export function categoryKey(category: TransactionListItem['category']): string {
  return category.id === null
    ? `source:${merchantKey(category.name ?? 'uncategorized')}`
    : `category:${category.id}`
}
export function resolveTransactionVisual(
  transaction: TransactionListItem,
  mappings?: VisualMappings,
) {
  const merchantAssetId = mappings?.merchantVisuals.find(
    (item) => item.key === merchantKey(transaction.originalDescription),
  )?.assetId
  const categoryAssetId = mappings?.categoryVisuals.find(
    (item) => item.key === categoryKey(transaction.category),
  )?.assetId
  return {
    assetId: merchantAssetId ?? categoryAssetId ?? null,
    builtIn: builtInIcon(transaction.category.name),
    monogram:
      transaction.originalDescription.trim().slice(0, 1).toLocaleUpperCase() ||
      '?',
  }
}
export function TransactionVisual({
  className,
  mappings,
  transaction,
}: {
  className?: string | undefined
  mappings?: VisualMappings | undefined
  transaction: TransactionListItem
}) {
  const visual = resolveTransactionVisual(transaction, mappings)
  return (
    <span className={className}>
      {visual.assetId ? (
        <img alt="" src={`/api/visual-assets/${visual.assetId}`} />
      ) : visual.builtIn ? (
        <CategoryIcon token={visual.builtIn} />
      ) : (
        visual.monogram
      )}
    </span>
  )
}
function builtInIcon(category: string | null): string | null {
  const value = category?.toLocaleLowerCase() ?? ''
  if (/grocer|продукт/.test(value)) return 'groceries'
  if (/restaurant|dining|cafe|food|ресторан|кафе/.test(value)) return 'dining'
  if (/fuel|gas|transport|палив|транспорт/.test(value)) return 'transport'
  if (/home|housing|rent|житл/.test(value)) return 'home'
  if (/health|medical|здоров/.test(value)) return 'health'
  if (/shop/.test(value)) return 'shopping'
  if (/travel/.test(value)) return 'travel'
  if (/education/.test(value)) return 'education'
  return null
}
