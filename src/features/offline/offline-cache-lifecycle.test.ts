import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('offline cache teardown', () => {
  it('closes a database connection that opens after cleanup has started', async () => {
    const close = vi.fn()
    const request: Partial<IDBOpenDBRequest> = {
      result: { close } as unknown as IDBDatabase,
    }
    vi.stubGlobal('indexedDB', {
      open: () => request,
      deleteDatabase: () => {
        const deletion: Partial<IDBOpenDBRequest> = {}
        queueMicrotask(() =>
          deletion.onsuccess?.call(deletion as IDBOpenDBRequest, {} as Event),
        )
        return deletion
      },
    })
    const { activatePrivateSession } = await import('../auth/private-session')
    const { clearOfflineCache, readOfflineData } =
      await import('./encrypted-offline-cache')
    activatePrivateSession(4_102_444_800)
    const rejected = expect(
      readOfflineData('/api/accounts'),
    ).rejects.toMatchObject({ reason: 'unavailable' })
    await clearOfflineCache()
    request.onsuccess?.call(request as IDBOpenDBRequest, {} as Event)
    await rejected
    expect(close).toHaveBeenCalledTimes(1)
  })

  it('retries database opening after a synchronous storage failure', async () => {
    const open = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new DOMException('Synthetic unavailable storage', 'SecurityError')
      })
      .mockImplementation(() => {
        const request: Partial<IDBOpenDBRequest> = {
          result: {
            transaction: () => {
              throw new Error('Opened successfully')
            },
          } as unknown as IDBDatabase,
        }
        queueMicrotask(() =>
          request.onsuccess?.call(request as IDBOpenDBRequest, {} as Event),
        )
        return request
      })
    vi.stubGlobal('indexedDB', { open })
    const { activatePrivateSession } = await import('../auth/private-session')
    const { readOfflineData } = await import('./encrypted-offline-cache')
    activatePrivateSession(4_102_444_800)
    await expect(readOfflineData('/api/accounts')).rejects.toThrow(
      'Synthetic unavailable storage',
    )
    await expect(readOfflineData('/api/accounts')).rejects.toThrow(
      'Opened successfully',
    )
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('reports blocked deletion, keeps cache access locked, and permits recovery after deletion completes', async () => {
    const requests: Partial<IDBOpenDBRequest>[] = []
    const deleteDatabase = vi.fn(() => {
      const request: Partial<IDBOpenDBRequest> = {}
      requests.push(request)
      queueMicrotask(() =>
        request.onblocked?.call(
          request as IDBOpenDBRequest,
          {} as IDBVersionChangeEvent,
        ),
      )
      return request
    })
    const open = vi.fn()
    vi.stubGlobal('indexedDB', { deleteDatabase, open })
    const { activatePrivateSession } = await import('../auth/private-session')
    const { clearOfflineCache, readOfflineData } =
      await import('./encrypted-offline-cache')
    activatePrivateSession(4_102_444_800)
    await expect(clearOfflineCache()).rejects.toMatchObject({
      reason: 'blocked',
    })
    await expect(readOfflineData('/api/accounts')).rejects.toMatchObject({
      reason: 'blocked',
    })
    expect(open).not.toHaveBeenCalled()
    await expect(clearOfflineCache()).rejects.toMatchObject({
      reason: 'blocked',
    })
    expect(deleteDatabase).toHaveBeenCalledTimes(1)
    requests[0]!.onsuccess?.call(requests[0] as IDBOpenDBRequest, {} as Event)
    deleteDatabase.mockImplementation(() => {
      const request: Partial<IDBOpenDBRequest> = {}
      queueMicrotask(() =>
        request.onsuccess?.call(request as IDBOpenDBRequest, {} as Event),
      )
      return request
    })
    await expect(clearOfflineCache()).resolves.toBeUndefined()
  })

  it('closes connections on versionchange so another tab can delete the cache', async () => {
    const close = vi.fn()
    const database: Partial<IDBDatabase> = {
      close,
      transaction: () => {
        throw new Error('Stop after opening')
      },
    }
    const open = vi.fn(() => {
      const request = {
        result: database,
        onsuccess: null as IDBOpenDBRequest['onsuccess'],
      }
      queueMicrotask(() =>
        request.onsuccess?.call(request as IDBOpenDBRequest, {} as Event),
      )
      return request
    })
    vi.stubGlobal('indexedDB', { open })
    const { activatePrivateSession } = await import('../auth/private-session')
    const { readOfflineData } = await import('./encrypted-offline-cache')
    activatePrivateSession(4_102_444_800)
    await expect(readOfflineData('/api/accounts')).rejects.toThrow(
      'Stop after opening',
    )
    database.onversionchange?.call(
      database as IDBDatabase,
      {} as IDBVersionChangeEvent,
    )
    expect(close).toHaveBeenCalledTimes(1)
    await expect(readOfflineData('/api/accounts')).rejects.toThrow(
      'Stop after opening',
    )
    expect(open).toHaveBeenCalledTimes(2)
  })

  it('reports an IndexedDB deletion failure without leaking its details', async () => {
    vi.stubGlobal('indexedDB', {
      deleteDatabase: () => {
        const request: Partial<IDBOpenDBRequest> = {}
        queueMicrotask(() =>
          request.onerror?.call(request as IDBOpenDBRequest, {} as Event),
        )
        return request
      },
    })
    const { clearOfflineCache } = await import('./encrypted-offline-cache')
    await expect(clearOfflineCache()).rejects.toMatchObject({
      reason: 'unavailable',
      message: 'Offline cache cleanup requires recovery.',
    })
  })
})
