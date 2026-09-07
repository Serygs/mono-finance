import { describe, expect, it } from 'vitest'

import { app } from '../app'

describe('GET /api/health', () => {
  it('returns the public health contract', async () => {
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Security-Policy')).toContain(
      "default-src 'none'",
    )
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull()
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    await expect(response.json()).resolves.toEqual({
      data: {
        status: 'ok',
      },
    })
  })

  it('requires authentication before revealing an unknown private endpoint', async () => {
    const response = await app.request('/api/unknown')

    expect(response.status).toBe(401)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'unauthenticated',
        message: 'Authentication is required.',
      },
    })
  })

  it('hardens the API root even when no route is registered there', async () => {
    const response = await app.request('/api')

    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })
})
