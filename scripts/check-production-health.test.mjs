import { describe, expect, it } from 'vitest'

import { parseProductionHealthUrl } from './check-production-health.mjs'

describe('parseProductionHealthUrl', () => {
  it('accepts an HTTPS production health endpoint', () => {
    expect(
      parseProductionHealthUrl(
        'https://mono-finance-production.example.workers.dev/api/health',
      ).href,
    ).toBe('https://mono-finance-production.example.workers.dev/api/health')
  })

  it('rejects a missing, blank, malformed, or non-HTTPS health endpoint', () => {
    expect(() => parseProductionHealthUrl(undefined)).toThrow(
      'PRODUCTION_HEALTH_URL is required',
    )
    expect(() => parseProductionHealthUrl('   ')).toThrow(
      'PRODUCTION_HEALTH_URL is required',
    )
    expect(() => parseProductionHealthUrl('not-a-url')).toThrow(
      'PRODUCTION_HEALTH_URL must be a valid HTTPS URL',
    )
    expect(() =>
      parseProductionHealthUrl('http://localhost/api/health'),
    ).toThrow('PRODUCTION_HEALTH_URL must use HTTPS')
  })
})
