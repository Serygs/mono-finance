import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('iOS PWA metadata', () => {
  it('opts into safe-area layout and standalone status-bar integration', () => {
    const html = readFileSync('index.html', 'utf8')
    const mobileStyles = readFileSync('src/styles/screen-layouts.css', 'utf8')

    expect(html).toContain('viewport-fit=cover')
    expect(html).toMatch(
      /name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"/u,
    )
    expect(mobileStyles).toContain('calc(env(safe-area-inset-top) + 0.55rem)')
    expect(mobileStyles).toContain('env(safe-area-inset-bottom)')
  })

  it('keeps the installed app inside the same-origin navigation scope', () => {
    const manifest = JSON.parse(
      readFileSync('public/manifest.webmanifest', 'utf8'),
    )

    expect(manifest).toMatchObject({
      display: 'standalone',
      id: '/',
      scope: '/',
      start_url: '/',
    })
  })
})
