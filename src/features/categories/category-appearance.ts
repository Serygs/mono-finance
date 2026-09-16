import type { CategoryIconToken } from '../../components/ui/CategoryIcon'

export const CATEGORY_ICONS = [
  { label: 'Wallet', token: 'wallet' },
  { label: 'Groceries', token: 'groceries' },
  { label: 'Dining', token: 'dining' },
  { label: 'Fuel', token: 'fuel' },
  { label: 'Home', token: 'home' },
  { label: 'Transport', token: 'transport' },
  { label: 'Health', token: 'health' },
  { label: 'Shopping', token: 'shopping' },
  { label: 'Entertainment', token: 'entertainment' },
  { label: 'Subscriptions', token: 'subscriptions' },
  { label: 'Travel', token: 'travel' },
  { label: 'Education', token: 'education' },
  { label: 'Bills', token: 'bills' },
  { label: 'Transfers', token: 'transfer' },
  { label: 'Utilities', token: 'utilities' },
  { label: 'Savings', token: 'savings' },
] as const

export const CATEGORY_COLORS = [
  { label: 'Blue', token: 'blue' },
  { label: 'Cyan', token: 'cyan' },
  { label: 'Mint', token: 'mint' },
  { label: 'Orange', token: 'orange' },
  { label: 'Pink', token: 'pink' },
  { label: 'Red', token: 'red' },
  { label: 'Purple', token: 'purple' },
  { label: 'Slate', token: 'slate' },
] as const

export type CategoryColorToken = (typeof CATEGORY_COLORS)[number]['token']

export function isCategoryIconToken(
  token: string | null | undefined,
): token is CategoryIconToken {
  return CATEGORY_ICONS.some((option) => option.token === token)
}
