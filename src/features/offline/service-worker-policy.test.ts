import { describe, expect, it } from 'vitest'

import {
  isCacheableShellRequest,
  isPrivateApiPath,
} from './service-worker-policy'

describe('service worker cache policy', () => {
  it('excludes every private API path from Cache Storage', () => {
    expect(isPrivateApiPath('/api/transactions?limit=50')).toBe(true)
    expect(isCacheableShellRequest('/api/transactions', '', 'GET')).toBe(false)
  })

  it('allows only GET application shell assets', () => {
    expect(isCacheableShellRequest('/assets/app.js', 'script', 'GET')).toBe(
      true,
    )
    expect(isCacheableShellRequest('/assets/app.js', 'script', 'POST')).toBe(
      false,
    )
  })
})
