/* eslint-disable react-refresh/only-export-components -- resolver helpers and their presentational wrappers share one visual contract. */
import {
  CategoryIcon,
  type CategoryIconToken,
} from '../../components/ui/CategoryIcon'
import {
  CATEGORY_COLORS,
  isCategoryIconToken,
  type CategoryColorToken,
} from '../categories/category-appearance'
import type { CustomCategory } from '../categories/categories-api'
import type { TransactionListItem } from '../transactions/transaction-types'
import type { VisualMappings } from './visuals-api'

const FALLBACK_COLORS = [
  'mint',
  'orange',
  'pink',
  'purple',
  'cyan',
  'red',
  'blue',
] as const satisfies readonly CategoryColorToken[]

interface DefaultVisualInput {
  categoryName?: string | null
  fallbackKey: string
  merchantName?: string | null
  monogramSource?: string | null
  originalCategoryName?: string | null
  originalMcc?: number | null
}

interface ResolvedVisual {
  assetId: string | null
  builtIn: CategoryIconToken | null
  colorToken: CategoryColorToken
  monogram: string
}

interface SemanticVisual {
  builtIn: CategoryIconToken
  colorToken: CategoryColorToken
}

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

export function resolveDefaultVisual(
  input: DefaultVisualInput,
): Omit<ResolvedVisual, 'assetId'> {
  const semantic =
    semanticVisual(input.categoryName) ??
    semanticVisual(input.originalCategoryName) ??
    mccVisual(input.originalMcc) ??
    semanticVisual(input.merchantName)

  return {
    builtIn: semantic?.builtIn ?? null,
    colorToken: semantic?.colorToken ?? stableColor(input.fallbackKey),
    monogram: monogram(
      input.monogramSource ??
        input.merchantName ??
        input.categoryName ??
        input.originalCategoryName,
    ),
  }
}

export function resolveTransactionVisual(
  transaction: TransactionListItem,
  mappings?: VisualMappings,
): ResolvedVisual {
  const merchantAssetId = mappings?.merchantVisuals.find(
    (item) => item.key === merchantKey(transaction.originalDescription),
  )?.assetId
  const categoryAssetId = mappings?.categoryVisuals.find(
    (item) => item.key === categoryKey(transaction.category),
  )?.assetId
  const fallbackKey =
    transaction.category.id ??
    transaction.originalCategory.id ??
    transaction.category.name ??
    transaction.originalCategory.name ??
    merchantKey(transaction.originalDescription)
  const automatic = resolveDefaultVisual({
    categoryName: transaction.category.name,
    fallbackKey,
    merchantName: transaction.originalDescription,
    monogramSource: transaction.originalDescription,
    originalCategoryName: transaction.originalCategory.name,
    originalMcc: transaction.originalMcc,
  })

  return {
    assetId: merchantAssetId ?? categoryAssetId ?? null,
    builtIn: isCategoryIconToken(transaction.category.icon)
      ? transaction.category.icon
      : automatic.builtIn,
    colorToken: isCategoryColorToken(transaction.category.colorToken)
      ? transaction.category.colorToken
      : automatic.colorToken,
    monogram: automatic.monogram,
  }
}

export function resolveCategoryVisual(
  category: CustomCategory,
  mappings?: VisualMappings,
): ResolvedVisual {
  const automatic = resolveDefaultVisual({
    categoryName: category.name,
    fallbackKey: category.id || category.name,
    monogramSource: category.name,
  })
  return {
    assetId:
      mappings?.categoryVisuals.find(
        (item) => item.key === `category:${category.id}`,
      )?.assetId ?? null,
    builtIn: isCategoryIconToken(category.icon)
      ? category.icon
      : automatic.builtIn,
    colorToken: isCategoryColorToken(category.colorToken)
      ? category.colorToken
      : automatic.colorToken,
    monogram: automatic.monogram,
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
  return (
    <ResolvedVisualView
      className={className}
      visual={resolveTransactionVisual(transaction, mappings)}
    />
  )
}

export function CategoryVisual({
  category,
  className,
  mappings,
}: {
  category: CustomCategory
  className?: string | undefined
  mappings?: VisualMappings | undefined
}) {
  return (
    <ResolvedVisualView
      className={className}
      visual={resolveCategoryVisual(category, mappings)}
    />
  )
}

function ResolvedVisualView({
  className,
  visual,
}: {
  className?: string | undefined
  visual: ResolvedVisual
}) {
  return (
    <span
      aria-hidden="true"
      className={[
        'ui-entity-visual',
        `ui-entity-visual--${visual.colorToken}`,
        visual.assetId === null ? undefined : 'ui-entity-visual--asset',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {visual.assetId !== null ? (
        <img alt="" src={`/api/visual-assets/${visual.assetId}`} />
      ) : visual.builtIn !== null ? (
        <CategoryIcon token={visual.builtIn} />
      ) : (
        visual.monogram
      )}
    </span>
  )
}

function semanticVisual(
  value: string | null | undefined,
): SemanticVisual | null {
  const normalized = value?.normalize('NFKC').toLocaleLowerCase() ?? ''
  if (normalized === '') return null
  if (/fuel|gas station|petrol|\bazs\b|палив|заправ|азс/.test(normalized))
    return { builtIn: 'fuel', colorToken: 'orange' }
  if (
    /grocer|supermarket|market|food store|продукт|супермаркет|бакал|харч/.test(
      normalized,
    )
  )
    return { builtIn: 'groceries', colorToken: 'mint' }
  if (
    /restaurant|dining|cafe|coffee|fast food|ресторан|кафе|кав’яр|кав'яр|їж|фастфуд/.test(
      normalized,
    )
  )
    return { builtIn: 'dining', colorToken: 'pink' }
  if (
    /rent|housing|home improvement|household|furniture|home|оренд|житл|будин|дім|ремонт|господар|мебл/.test(
      normalized,
    )
  )
    return { builtIn: 'home', colorToken: 'purple' }
  if (
    /travel|hotel|airline|flight|tourism|подорож|готел|авіа|літак|туризм/.test(
      normalized,
    )
  )
    return { builtIn: 'travel', colorToken: 'blue' }
  if (
    /transport|transit|taxi|bus|metro|rail|train|транспорт|таксі|автобус|метро|залізн|поїзд/.test(
      normalized,
    )
  )
    return { builtIn: 'transport', colorToken: 'cyan' }
  if (
    /health|medical|medicine|pharmacy|doctor|здоров|медич|аптек|ліки|лікар/.test(
      normalized,
    )
  )
    return { builtIn: 'health', colorToken: 'red' }
  if (/subscription|streaming|підпис/.test(normalized))
    return { builtIn: 'subscriptions', colorToken: 'purple' }
  if (
    /entertainment|cinema|movie|game|theatre|розваг|кіно|ігр|театр/.test(
      normalized,
    )
  )
    return { builtIn: 'entertainment', colorToken: 'pink' }
  if (
    /utilities|utility|electric|internet|mobile|bill|комунал|електр|інтернет|мобільн|рахунк/.test(
      normalized,
    )
  )
    return { builtIn: 'utilities', colorToken: 'orange' }
  if (
    /transfer|income|salary|top.?up|переказ|дохід|зарплат|поповнен/.test(
      normalized,
    )
  )
    return { builtIn: 'transfer', colorToken: 'mint' }
  if (/shopping|clothing|shoes|retail|покуп|магазин|одяг|взут/.test(normalized))
    return { builtIn: 'shopping', colorToken: 'orange' }
  if (/education|school|course|book|освіт|навчан|курс|книг/.test(normalized))
    return { builtIn: 'education', colorToken: 'cyan' }
  if (/saving|investment|заощад|інвест/.test(normalized))
    return { builtIn: 'savings', colorToken: 'mint' }
  return null
}

function mccVisual(mcc: number | null | undefined): SemanticVisual | null {
  if (mcc === null || mcc === undefined) return null
  if ([5411, 5422, 5441, 5451, 5462, 5499].includes(mcc))
    return { builtIn: 'groceries', colorToken: 'mint' }
  if ([5811, 5812, 5813, 5814].includes(mcc))
    return { builtIn: 'dining', colorToken: 'pink' }
  if ([5541, 5542, 5983].includes(mcc))
    return { builtIn: 'fuel', colorToken: 'orange' }
  if ([4111, 4112, 4121, 4131, 4789].includes(mcc))
    return { builtIn: 'transport', colorToken: 'cyan' }
  if ((mcc >= 3000 && mcc <= 3299) || [4511, 4722, 7011].includes(mcc))
    return { builtIn: 'travel', colorToken: 'blue' }
  if ([5912, 8011, 8021, 8041, 8050, 8062, 8099].includes(mcc))
    return { builtIn: 'health', colorToken: 'red' }
  if ([4812, 4814, 4899, 4900].includes(mcc))
    return { builtIn: 'utilities', colorToken: 'orange' }
  if ([7832, 7841, 7911, 7922, 7996, 7999].includes(mcc))
    return { builtIn: 'entertainment', colorToken: 'pink' }
  if ((mcc >= 5200 && mcc <= 5399) || (mcc >= 5600 && mcc <= 5699))
    return { builtIn: 'shopping', colorToken: 'orange' }
  if ((mcc >= 6010 && mcc <= 6051) || mcc === 4829)
    return { builtIn: 'transfer', colorToken: 'mint' }
  return null
}

function stableColor(key: string): CategoryColorToken {
  let hash = 2_166_136_261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return FALLBACK_COLORS[(hash >>> 0) % FALLBACK_COLORS.length] ?? 'mint'
}

function isCategoryColorToken(
  token: string | null | undefined,
): token is CategoryColorToken {
  return CATEGORY_COLORS.some((option) => option.token === token)
}

function monogram(value: string | null | undefined): string {
  return value?.trim().slice(0, 1).toLocaleUpperCase() || '?'
}
