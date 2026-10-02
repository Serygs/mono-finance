import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { accountQueryKeys, useAccountsQuery } from '../accounts/account-queries'
import { synchronizeAccounts } from '../accounts/accounts-api'
import { dashboardQueryKeys } from '../dashboard/dashboard-query-keys'
import type { TranslationKey } from '../localization/localization'
import {
  getTransactionSyncStatus,
  synchronizeTransactions,
} from '../transactions/transaction-sync-api'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'
import {
  refreshTransactionLedger,
  transactionQueryKeys,
} from '../transactions/transaction-queries'

export function useDashboardSync() {
  const client = useQueryClient()
  const accountsQuery = useAccountsQuery()
  const [syncingAccounts, setSyncingAccounts] = useState(false)
  const [syncingTransactions, setSyncingTransactions] = useState(false)
  const [syncStates, setSyncStates] = useState<TransactionSyncState[] | null>(
    null,
  )
  const [error, setError] = useState<TranslationKey | null>(null)
  useEffect(() => {
    void getTransactionSyncStatus()
      .then(setSyncStates)
      .catch(() => setError('Transaction sync status could not be loaded.'))
  }, [])
  async function syncAccounts() {
    setError(null)
    setSyncingAccounts(true)
    try {
      client.setQueryData(accountQueryKeys.all, await synchronizeAccounts())
      await client.invalidateQueries({ queryKey: dashboardQueryKeys.analytics })
    } catch {
      setError('Accounts could not be synchronized. Try again later.')
    } finally {
      setSyncingAccounts(false)
    }
  }
  async function syncTransactions() {
    setError(null)
    setSyncingTransactions(true)
    try {
      await synchronizeTransactions()
      await refreshTransactionLedger(client)
      const nextStates = await getTransactionSyncStatus().catch(() => {
        setError('Transaction sync status could not be loaded.')
        return null
      })
      if (nextStates !== null) {
        setSyncStates(nextStates)
        client.setQueryData(transactionQueryKeys.syncStatus, nextStates)
      }
    } catch {
      setError('Transaction sync is unavailable. Try again later.')
    } finally {
      setSyncingTransactions(false)
    }
  }
  const errorMessage: TranslationKey | null =
    error ??
    (accountsQuery.isError
      ? 'Accounts could not be loaded. Try again later.'
      : null)
  return {
    accounts: accountsQuery.data,
    syncingAccounts,
    syncingTransactions,
    syncStates,
    syncAccounts,
    syncTransactions,
    error: errorMessage,
  }
}
