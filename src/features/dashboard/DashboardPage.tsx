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

export function DashboardPage() {
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSynchronizing, setIsSynchronizing] = useState(false)
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
        <button
          className="sync-accounts-button"
          disabled={isSynchronizing || accounts === null}
          onClick={() => void handleSynchronize()}
          type="button"
        >
          {isSynchronizing ? 'Syncing…' : 'Sync accounts'}
        </button>
      </section>

      {error === null ? null : (
        <p className="accounts-error" role="alert">
          {error}
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
