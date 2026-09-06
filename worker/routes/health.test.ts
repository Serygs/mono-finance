import { describe, expect, it } from 'vitest'

import { app } from '../app'

describe('GET /api/health', () => {
  it('returns the public health contract', async () => {
    const response = await app.request('/api/health')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        status: 'ok',
      },
    })
  })

  it('requires authentication before revealing an unknown private endpoint', async () => {
    const response = await app.request('/api/unknown')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'unauthenticated',
        message: 'Authentication is required.',
      },
    })
  })
})
