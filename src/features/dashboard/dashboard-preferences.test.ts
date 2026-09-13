import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DASHBOARD_PREFERENCES,
  loadDashboardPreferences,
  resetDashboardLayout,
  saveDashboardPreferences,
  type DashboardPreferences,
} from './dashboard-preferences'

describe('dashboard preferences', () => {
  it('uses the focused dashboard widgets and recent transaction limit by default', () => {
    expect(DEFAULT_DASHBOARD_PREFERENCES.enabledWidgetIds).toEqual([
      'recent-transactions',
      'income-expenses',
      'spending-by-category',
      'spending-trend',
      'monthly-trend',
    ])
    expect(DEFAULT_DASHBOARD_PREFERENCES.recentTransactionsLimit).toBe(10)
  })

  it('persists user-selected widgets and layouts without touching analytics state', () => {
    const storage = new MapStorage()
    const preferences: DashboardPreferences = {
      ...DEFAULT_DASHBOARD_PREFERENCES,
      enabledWidgetIds: ['recent-transactions', 'largest-transactions'],
      layout: [{ h: 7, i: 'largest-transactions', w: 6, x: 6, y: 0 }],
      recentTransactionsLimit: 20,
    }

    saveDashboardPreferences(storage, preferences)

    expect(loadDashboardPreferences(storage)).toEqual(preferences)
  })

  it('resets only positions and dimensions while preserving widget visibility', () => {
    const preferences: DashboardPreferences = {
      ...DEFAULT_DASHBOARD_PREFERENCES,
      enabledWidgetIds: ['recent-transactions', 'top-merchants'],
      layout: [{ h: 4, i: 'top-merchants', w: 3, x: 9, y: 8 }],
    }

    expect(resetDashboardLayout(preferences).enabledWidgetIds).toEqual(
      preferences.enabledWidgetIds,
    )
    expect(resetDashboardLayout(preferences).layout).toEqual([])
  })
})

class MapStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}
