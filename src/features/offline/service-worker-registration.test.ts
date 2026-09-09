import { describe, expect, it, vi } from 'vitest'

import { registerServiceWorker } from './service-worker-registration'

describe('registerServiceWorker', () => {
  it('registers and checks the application shell worker without using a stale HTTP cache', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const register = vi.fn().mockResolvedValue({ update })

    registerServiceWorker({
      addEventListener: vi.fn(),
      controller: null,
      register,
    } as unknown as ServiceWorkerContainer)

    expect(register).toHaveBeenCalledWith('/service-worker.js', {
      updateViaCache: 'none',
    })
    await vi.waitFor(() => expect(update).toHaveBeenCalledOnce())
  })

  it('reloads once when an updated worker takes control of an existing PWA', async () => {
    let controllerChange: (() => void) | undefined
    const update = vi.fn().mockResolvedValue(undefined)
    const serviceWorker = {
      addEventListener: vi.fn(
        (event: string, listener: EventListenerOrEventListenerObject) => {
          if (event === 'controllerchange') {
            controllerChange = () =>
              typeof listener === 'function'
                ? listener(new Event('controllerchange'))
                : listener.handleEvent(new Event('controllerchange'))
          }
        },
      ),
      controller: {},
      register: vi.fn().mockResolvedValue({ update }),
    }
    const reload = vi.fn()

    registerServiceWorker(
      serviceWorker as unknown as ServiceWorkerContainer,
      reload,
    )
    await vi.waitFor(() => expect(update).toHaveBeenCalledOnce())
    controllerChange?.()
    controllerChange?.()

    expect(reload).toHaveBeenCalledOnce()
  })

  it('does nothing in unsupported browsers', () => {
    expect(() => registerServiceWorker(undefined)).not.toThrow()
  })
})
