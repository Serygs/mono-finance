import type { TransactionListItem, TransactionPage } from './transaction-types'

// A cursor can overlap a previous page when records change between requests.
// Keep the first occurrence in API order; never mutate the cached page records.
export function loadedTransactions(
  pages: readonly TransactionPage[],
): TransactionListItem[] {
  const seen = new Set<string>()
  return pages.flatMap((page) =>
    page.transactions.filter((transaction) => {
      if (seen.has(transaction.id)) return false
      seen.add(transaction.id)
      return true
    }),
  )
}
