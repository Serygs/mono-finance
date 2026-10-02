import { useEffect, useMemo, useState } from 'react'
import {
  loadAccountFilter,
  saveAccountFilter,
  type AccountFilter,
} from '../accounts/account-filter-storage'
import {
  DEFAULT_DASHBOARD_DATE_PRESET,
  resolveDashboardRange,
  type DashboardDatePreset,
} from './dashboard-data'

export function useDashboardFilters() {
  const [filter, setFilter] = useState<AccountFilter>(loadAccount)
  const [preset, setPreset] = useState<DashboardDatePreset>(
    DEFAULT_DASHBOARD_DATE_PRESET,
  )
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [mode, setMode] = useState<'base' | 'original'>('original')
  const [currency, setCurrency] = useState<string | null>(null)
  const range = useMemo(
    () => resolveDashboardRange(preset, from, to),
    [from, preset, to],
  )
  const accountIds = useMemo(
    () => (filter.mode === 'selected' ? filter.accountIds : []),
    [filter],
  )
  useEffect(() => {
    storeAccount(filter)
  }, [filter])
  return {
    filter,
    setFilter,
    preset,
    setPreset,
    from,
    setFrom,
    to,
    setTo,
    mode,
    setMode,
    currency,
    setCurrency,
    range,
    accountIds,
  }
}
function loadAccount(): AccountFilter {
  try {
    return loadAccountFilter(window.localStorage)
  } catch {
    return { mode: 'all' }
  }
}
function storeAccount(filter: AccountFilter) {
  try {
    saveAccountFilter(window.localStorage, filter)
  } catch {
    /* Kept in memory. */
  }
}
