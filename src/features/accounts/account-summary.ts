import type { AccountSummary } from './account-types'

export interface CurrencyBalance {
  accountCount: number
  balanceMinor: bigint
  code: string
  displayName: string
  minorUnit: number
}

export function summarizeCurrencyBalances(
  accounts: readonly AccountSummary[],
): CurrencyBalance[] {
  const totals = new Map<string, CurrencyBalance>()
  for (const account of accounts) {
    const current = totals.get(account.currency.code)
    if (current === undefined) {
      totals.set(account.currency.code, {
        accountCount: 1,
        balanceMinor: BigInt(account.balanceMinor),
        code: account.currency.code,
        displayName: account.currency.displayName,
        minorUnit: account.currency.minorUnit,
      })
      continue
    }
    current.accountCount += 1
    current.balanceMinor += BigInt(account.balanceMinor)
  }
  return [...totals.values()]
}
