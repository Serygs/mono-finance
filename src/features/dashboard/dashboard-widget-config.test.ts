import { describe, expect, it } from 'vitest'
import {
  compareWidgetOrder,
  defaultWidgetLayout,
} from './dashboard-widget-config'
import { DEFAULT_DASHBOARD_PREFERENCES } from './dashboard-preferences'

describe('dashboard widget layout configuration', () => {
  it('preserves default sizes, placement and resize limits', () => {
    expect(
      defaultWidgetLayout({ id: 'income-expenses', w: 6, h: 7 }, 0),
    ).toEqual({
      i: 'income-expenses',
      w: 6,
      h: 7,
      x: 0,
      y: 7,
      minW: 3,
      minH: 4,
    })
    expect(
      defaultWidgetLayout({ id: 'recent-transactions', w: 6, h: 7 }, 0),
    ).toEqual({
      i: 'recent-transactions',
      w: 12,
      h: 6,
      x: 0,
      y: 0,
      minW: 3,
      minH: 4,
    })
  })

  it('uses saved positions for mobile order and defaults when positions tie or are missing', () => {
    const preferences = {
      ...DEFAULT_DASHBOARD_PREFERENCES,
      layout: [
        { i: 'income-expenses', x: 0, y: 4, w: 6, h: 7 },
        { i: 'spending-trend', x: 0, y: 0, w: 6, h: 7 },
      ],
    }
    expect(
      compareWidgetOrder('spending-trend', 'income-expenses', preferences),
    ).toBeLessThan(0)
    expect(
      compareWidgetOrder(
        'income-expenses',
        'spending-by-category',
        preferences,
      ),
    ).toBeLessThan(0)
    preferences.layout[0]!.y = 0
    expect(
      compareWidgetOrder('income-expenses', 'spending-trend', preferences),
    ).toBeLessThan(0)
  })
})
