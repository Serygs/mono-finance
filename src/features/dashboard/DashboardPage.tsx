import { useEffect, useState } from 'react'

import {
  loadAccountFilter,
  saveAccountFilter,
  toggleAccountFilter,
  type AccountFilter,
} from '../accounts/account-filter-storage'
import { AccountSelector } from '../accounts/AccountSelector'
import type { AccountSummary } from '../accounts/account-types'
import { getAccounts, synchronizeAccounts } from '../accounts/accounts-api'
import { TransactionSyncStatus } from '../transactions/TransactionSyncStatus'
import {
  getTransactionSyncStatus,
  synchronizeTransactions,
} from '../transactions/transaction-sync-api'
import type { TransactionSyncState } from '../transactions/transaction-sync-types'

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
  const [isTransactionSynchronizing, setIsTransactionSynchronizing] =
    useState(false)
  const [syncStates, setSyncStates] = useState<TransactionSyncState[] | null>(
    null,
  )
  const [syncStatusError, setSyncStatusError] = useState<string | null>(null)
  const [filter, setFilter] = useState<AccountFilter>(loadBrowserAccountFilter)

  useEffect(() => {
    let active = true
    void getAccounts()
      .then((loadedAccounts) => {
        if (active) {
          setAccounts(loadedAccounts)
        }
      })
      .catch(() => {
        if (active) {
          setError('Accounts could not be loaded. Try again later.')
        }
      })

    void getTransactionSyncStatus()
      .then((states) => {
        if (active) {
          setSyncStates(states)
        }
      })
      .catch(() => {
        if (active) {
          setSyncStatusError('Transaction sync status could not be loaded.')
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    saveBrowserAccountFilter(filter)
  }, [filter])

  async function handleSynchronize() {
    setIsSynchronizing(true)
    setError(null)
    try {
      setAccounts(await synchronizeAccounts())
    } catch (syncError) {
      setError(
        syncError instanceof Error
          ? syncError.message
          : 'Accounts could not be synchronized. Try again later.',
      )
    } finally {
      setIsSynchronizing(false)
    }
  }

  async function handleTransactionSynchronize() {
    setIsTransactionSynchronizing(true)
    setSyncStatusError(null)
    try {
      await synchronizeTransactions()
      setSyncStates(await getTransactionSyncStatus())
    } catch (syncError) {
      setSyncStatusError(
        syncError instanceof Error
          ? syncError.message
          : 'Transaction sync is unavailable. Try again later.',
      )
    } finally {
      setIsTransactionSynchronizing(false)
    }
  }

  return (
    <>
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">Personal finance</p>
          <h1 id="dashboard-title">Your accounts, one clear view.</h1>
          <p className="page-description">
            Select the accounts that should shape your workspace. Transaction
            analytics will follow in its dedicated phase.
          </p>
        </div>
        <div className="sync-actions">
          <button
            className="sync-accounts-button"
            disabled={isSynchronizing || accounts === null}
            onClick={() => void handleSynchronize()}
            type="button"
          >
            {isSynchronizing ? 'Syncing…' : 'Sync accounts'}
          </button>
          <button
            className="sync-transactions-button"
            disabled={isTransactionSynchronizing || accounts === null}
            onClick={() => void handleTransactionSynchronize()}
            type="button"
          >
            {isTransactionSynchronizing
              ? 'Refreshing…'
              : 'Refresh transactions'}
          </button>
        </div>
      </section>

      {error === null ? null : (
        <p className="accounts-error" role="alert">
          {error}
        </p>
      )}

      {syncStatusError === null ? null : (
        <p className="accounts-error" role="alert">
          {syncStatusError}
        </p>
      )}

      {accounts === null ? (
        <p className="accounts-loading" role="status">
          Loading accounts…
        </p>
      ) : (
        <AccountSelector
          accounts={accounts}
          filter={filter}
          onSelectAll={() => setFilter({ mode: 'all' })}
          onToggle={(accountId) =>
            setFilter((current) => toggleAccountFilter(current, accountId))
          }
        />
      )}

      <TransactionSyncStatus states={syncStates} />
    </>
  )
}

function loadBrowserAccountFilter(): AccountFilter {
  try {
    return loadAccountFilter(window.localStorage)
  } catch {
    return { mode: 'all' }
  }
}

function saveBrowserAccountFilter(filter: AccountFilter): void {
  try {
    saveAccountFilter(window.localStorage, filter)
  } catch {
    // Keep the in-memory selection when browser storage is unavailable.
  }
}
