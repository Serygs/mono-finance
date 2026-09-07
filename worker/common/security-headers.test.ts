import { describe, expect, it } from 'vitest'

import { applyApiSecurityHeaders } from './security-headers'

describe('API security headers', () => {
  it('prevents sensitive API responses from being cached or embedded', () => {
    const headers = new Headers()

    applyApiSecurityHeaders(headers, { APP_ENV: 'development' })

    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(headers.get('Content-Security-Policy')).toContain(
      "default-src 'none'",
    )
    expect(headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
    expect(headers.get('Pragma')).toBe('no-cache')
    expect(headers.get('Referrer-Policy')).toBe('no-referrer')
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(headers.get('X-Frame-Options')).toBe('DENY')
    expect(headers.get('Strict-Transport-Security')).toBeNull()
  })

  it('enforces HTTPS persistence only in production', () => {
    const headers = new Headers()

    applyApiSecurityHeaders(headers, { APP_ENV: 'production' })

    expect(headers.get('Strict-Transport-Security')).toBe('max-age=63072000')
  })
})
