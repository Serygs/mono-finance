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

  it('returns the shared error contract for an unknown endpoint', async () => {
    const response = await app.request('/api/unknown')

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: {
        code: 'not_found',
        message: 'Resource not found.',
      },
    })
  })
})
