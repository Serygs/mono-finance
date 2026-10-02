import { useEffect, useState } from 'react'
import {
  DEFAULT_DASHBOARD_PREFERENCES,
  loadDashboardPreferences,
  saveDashboardPreferences,
  type DashboardPreferences,
} from './dashboard-preferences'

export function useDashboardPreferences() {
  const [preferences, setPreferences] =
    useState<DashboardPreferences>(loadPreferences)
  useEffect(() => {
    storePreferences(preferences)
  }, [preferences])
  return { preferences, setPreferences }
}
function loadPreferences(): DashboardPreferences {
  try {
    return loadDashboardPreferences(window.localStorage)
  } catch {
    return DEFAULT_DASHBOARD_PREFERENCES
  }
}
function storePreferences(preferences: DashboardPreferences) {
  try {
    saveDashboardPreferences(window.localStorage, preferences)
  } catch {
    /* Kept in memory. */
  }
}
