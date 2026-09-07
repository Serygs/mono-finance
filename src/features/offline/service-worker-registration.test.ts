import { describe, expect, it, vi } from 'vitest'

import { registerServiceWorker } from './service-worker-registration'

describe('registerServiceWorker', () => {
  it('registers the application shell worker when the browser supports it', () => {
    const register = vi.fn().mockResolvedValue(undefined)

    registerServiceWorker({ register } as unknown as ServiceWorkerContainer)

    expect(register).toHaveBeenCalledWith('/service-worker.js')
  })

  it('does nothing in unsupported browsers', () => {
    expect(() => registerServiceWorker(undefined)).not.toThrow()
  })
})
