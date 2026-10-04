import { describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './service-worker-registration'
import { ServiceWorkerUpdates } from './service-worker-updates'

function fixture(controlled = true) {
  const worker = Object.assign(new EventTarget(), { postMessage: vi.fn() })
  const registration = Object.assign(new EventTarget(), {
    installing: null as EventTarget | null,
    waiting: null as typeof worker | null,
    update: vi.fn().mockResolvedValue(undefined),
  })
  const container = Object.assign(new EventTarget(), {
    controller: controlled ? worker : null,
    register: vi.fn().mockResolvedValue(registration),
  })
  const reload = vi.fn()
  const updates = new ServiceWorkerUpdates(reload)
  return { container, registration, worker, reload, updates }
}

describe('registerServiceWorker', () => {
  it('registers and checks the shell without using a stale HTTP cache', async () => {
    const { container, registration, updates } = fixture(false)
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      updates,
    )
    expect(container.register).toHaveBeenCalledWith('/service-worker.js', {
      updateViaCache: 'none',
    })
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce())
  })

  it('detects an already waiting update without forcing activation or reload', async () => {
    const { container, registration, worker, reload, updates } = fixture()
    registration.waiting = worker
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      updates,
    )
    await vi.waitFor(() =>
      expect(updates.getSnapshot().status).toBe('available'),
    )
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'detects a worker installing %s before registration resolves',
    async (alreadyInstalling) => {
      const { container, registration, worker, updates } = fixture()
      if (alreadyInstalling) registration.installing = worker
      registerServiceWorker(
        container as unknown as ServiceWorkerContainer,
        updates,
      )
      await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce())
      if (!alreadyInstalling) {
        registration.installing = worker
        registration.dispatchEvent(new Event('updatefound'))
      }
      registration.waiting = worker
      worker.dispatchEvent(new Event('statechange'))
      expect(updates.getSnapshot().status).toBe('available')
    },
  )

  it('ignores initial claim but detects later updates in the same tab', async () => {
    const { container, registration, reload, updates } = fixture(false)
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      updates,
    )
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce())
    container.dispatchEvent(new Event('controllerchange'))
    expect(updates.getSnapshot().status).toBe('current')
    container.dispatchEvent(new Event('controllerchange'))
    expect(reload).not.toHaveBeenCalled()
    updates.requestUpdate()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not offer an initial worker that is briefly waiting before its first claim', async () => {
    const { container, registration, worker, updates } = fixture(false)
    registration.installing = worker
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      updates,
    )
    await vi.waitFor(() => expect(registration.update).toHaveBeenCalledOnce())
    registration.waiting = worker
    worker.dispatchEvent(new Event('statechange'))
    expect(updates.getSnapshot().status).toBe('current')
    registration.waiting = null
    container.controller = worker
    container.dispatchEvent(new Event('controllerchange'))
    expect(updates.getSnapshot().status).toBe('current')
  })

  it('keeps the online application usable if registration fails', async () => {
    const { container, updates } = fixture()
    container.register.mockRejectedValue(new Error('Synthetic failure'))
    registerServiceWorker(
      container as unknown as ServiceWorkerContainer,
      updates,
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(updates.getSnapshot().status).toBe('current')
  })

  it('does nothing in unsupported browsers', () => {
    expect(() => registerServiceWorker(undefined)).not.toThrow()
  })
})
