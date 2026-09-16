import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CategoryAppearanceFields } from './CategoryAppearanceFields'
import { CATEGORY_COLORS, CATEGORY_ICONS } from './category-appearance'

describe('category appearance fields', () => {
  it('offers predefined finance icons and colors as radio groups', () => {
    const markup = renderToStaticMarkup(
      <CategoryAppearanceFields
        colorToken="purple"
        icon="groceries"
        translate={(message) => message}
      />,
    )

    expect(CATEGORY_ICONS.map(({ token }) => token)).toEqual([
      'wallet',
      'groceries',
      'dining',
      'fuel',
      'home',
      'transport',
      'health',
      'shopping',
      'entertainment',
      'subscriptions',
      'travel',
      'education',
      'bills',
      'transfer',
      'utilities',
      'savings',
    ])
    expect(CATEGORY_COLORS.map(({ token }) => token)).toEqual([
      'blue',
      'cyan',
      'mint',
      'orange',
      'pink',
      'red',
      'purple',
      'slate',
    ])
    expect(markup).toContain('role="radiogroup"')
    expect(markup).toContain('name="icon"')
    expect(markup).toMatch(
      /<input[^>]+name="icon"[^>]+checked=""[^>]+value="groceries"/,
    )
    expect(markup).toContain('name="colorToken"')
    expect(markup).toMatch(
      /<input[^>]+name="colorToken"[^>]+checked=""[^>]+value="purple"/,
    )
  })

  it('falls back to safe defaults for unsupported stored tokens', () => {
    const markup = renderToStaticMarkup(
      <CategoryAppearanceFields
        colorToken="legacy-color"
        icon="legacy-icon"
        translate={(message) => message}
      />,
    )

    expect(markup).toMatch(
      /<input[^>]+name="icon"[^>]+checked=""[^>]+value="wallet"/,
    )
    expect(markup).toMatch(
      /<input[^>]+name="colorToken"[^>]+checked=""[^>]+value="blue"/,
    )
  })
})
