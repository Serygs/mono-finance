import { useLocation } from 'react-router'
import { useFinanceViewHistory } from '../../lib/use-finance-view-history'
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
  const location = useLocation()
  const saved = location.state?.financeView as
    | {
        filter: AccountFilter
        preset: DashboardDatePreset
        from: string
        to: string
        mode: 'base' | 'original'
        currency: string | null
      }
    | undefined
  const [filter, setFilter] = useState<AccountFilter>(
    () => saved?.filter ?? loadAccount(),
  )
  const [preset, setPreset] = useState<DashboardDatePreset>(
    saved?.preset ?? DEFAULT_DASHBOARD_DATE_PRESET,
  )
  const [from, setFrom] = useState(saved?.from ?? '')
  const [to, setTo] = useState(saved?.to ?? '')
  const [mode, setMode] = useState<'base' | 'original'>(
    saved?.mode ?? 'original',
  )
  const [currency, setCurrency] = useState<string | null>(
    saved?.currency ?? null,
  )
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
  const view = useMemo(
    () => ({ filter, preset, from, to, mode, currency }),
    [filter, preset, from, to, mode, currency],
  )
  useFinanceViewHistory(view)
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
