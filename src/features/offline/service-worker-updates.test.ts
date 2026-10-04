import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ServiceWorkerUpdates } from './service-worker-updates'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

function fixture() {
  const reload = vi.fn()
  const worker = { postMessage: vi.fn() }
  const updates = new ServiceWorkerUpdates(reload)
  updates.updateAvailable(worker)
  return { reload, worker, updates }
}

describe('safe Service Worker updates', () => {
  it('requires consent while idle and reloads once after activation', () => {
    const { reload, worker, updates } = fixture()
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    updates.requestUpdate()
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'SKIP_WAITING',
    })
    expect(reload).not.toHaveBeenCalled()
    updates.controllerChanged()
    updates.controllerChanged()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('does not activate or retain an update request made during editing', () => {
    const { reload, worker, updates } = fixture()
    const finishEditing = updates.blockForEditor()
    updates.requestUpdate()
    expect(updates.getSnapshot().editing).toBe(true)
    finishEditing()
    expect(worker.postMessage).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
    updates.requestUpdate()
    expect(worker.postMessage).toHaveBeenCalledOnce()
  })

  it('protects independent editors until all are closed', () => {
    const { updates } = fixture()
    const first = updates.blockForEditor()
    const second = updates.blockForEditor()
    first()
    expect(updates.getSnapshot().editing).toBe(true)
    second()
    expect(updates.getSnapshot().editing).toBe(false)
  })

  it('does not accept an update while offline', () => {
    const { updates, worker } = fixture()
    updates.setOnline(false)
    updates.requestUpdate()
    updates.setOnline(true)
    expect(worker.postMessage).not.toHaveBeenCalled()
    updates.requestUpdate()
    expect(worker.postMessage).toHaveBeenCalledOnce()
  })

  it('waits for connectivity before activating an accepted update', () => {
    const { updates, worker } = fixture()
    updates.setPendingMutations(true)
    updates.requestUpdate()
    updates.setOnline(false)
    updates.setPendingMutations(false)
    expect(worker.postMessage).not.toHaveBeenCalled()
    updates.setOnline(true)
    expect(worker.postMessage).toHaveBeenCalledOnce()
    updates.controllerChanged()
  })

  it('rechecks connectivity before reloading an activated worker', () => {
    const { updates, reload } = fixture()
    updates.requestUpdate()
    updates.setOnline(false)
    updates.controllerChanged()
    expect(reload).not.toHaveBeenCalled()
    updates.setOnline(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('waits for pending mutations before activation and rechecks before reload', () => {
    const { reload, worker, updates } = fixture()
    updates.setPendingMutations(true)
    updates.requestUpdate()
    expect(updates.getSnapshot().status).toBe('waiting')
    expect(worker.postMessage).not.toHaveBeenCalled()
    updates.setPendingMutations(false)
    expect(worker.postMessage).toHaveBeenCalledOnce()
    updates.setPendingMutations(true)
    updates.controllerChanged()
    expect(reload).not.toHaveBeenCalled()
    updates.setPendingMutations(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('rechecks an editor opened while activation is in flight', () => {
    const { reload, updates } = fixture()
    updates.requestUpdate()
    const finishEditing = updates.blockForEditor()
    updates.controllerChanged()
    expect(reload).not.toHaveBeenCalled()
    finishEditing()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('requires this tab to consent after activation in another tab', () => {
    const { reload, updates } = fixture()
    const finishEditing = updates.blockForEditor()
    updates.controllerChanged()
    finishEditing()
    expect(reload).not.toHaveBeenCalled()
    updates.setPendingMutations(true)
    updates.requestUpdate()
    expect(reload).not.toHaveBeenCalled()
    updates.setPendingMutations(false)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('recovers from a failed activation message and a timeout', () => {
    const { reload, worker, updates } = fixture()
    worker.postMessage.mockImplementationOnce(() => {
      throw new Error('Synthetic unavailable worker')
    })
    updates.requestUpdate()
    expect(updates.getSnapshot().status).toBe('failed')
    updates.requestUpdate()
    vi.advanceTimersByTime(15_000)
    expect(updates.getSnapshot().status).toBe('failed')
    expect(reload).not.toHaveBeenCalled()
    updates.requestUpdate()
    updates.controllerChanged()
    expect(reload).toHaveBeenCalledOnce()
  })

  it('waits for Query mutation completion callbacks as well as the request', async () => {
    const { reload, worker, updates } = fixture()
    const client = new QueryClient()
    const unsubscribe = client.getMutationCache().subscribe(() => {
      updates.setPendingMutations(client.isMutating() > 0)
    })
    let finishCallback!: () => void
    const callback = new Promise<void>((resolve) => {
      finishCallback = resolve
    })
    const mutation = client.getMutationCache().build(client, {
      mutationFn: async () => ({ saved: true }),
      onSuccess: () => callback,
    })
    try {
      const completed = mutation.execute(undefined)
      updates.requestUpdate()
      await Promise.resolve()
      expect(worker.postMessage).not.toHaveBeenCalled()
      finishCallback()
      await completed
      expect(worker.postMessage).toHaveBeenCalledOnce()
      updates.controllerChanged()
      expect(reload).toHaveBeenCalledOnce()
    } finally {
      unsubscribe()
      client.clear()
    }
  })
})
