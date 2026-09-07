import { cacheOfflineData, readOfflineData } from './encrypted-offline-cache'

export interface OfflineReadResult<T> {
  cachedAt: number | null
  source: 'network' | 'offline-cache'
  value: T
}

type OfflineStatus = {
  cachedAt: number | null
  source: 'network' | 'offline-cache' | null
}

let offlineStatus: OfflineStatus = { cachedAt: null, source: null }
const listeners = new Set<() => void>()

export async function getOfflineApiData<T>(
  resource: string,
  loadFromNetwork: () => Promise<T>,
): Promise<T> {
  try {
    const value = await loadFromNetwork()
    try {
      await cacheOfflineData(resource, value)
      publishOfflineStatus({ cachedAt: Date.now(), source: 'network' })
    } catch {
      // IndexedDB can be unavailable in private browsing or unsupported browsers.
      // A live D1 response remains valid even when local offline storage is disabled.
    }
    return value
  } catch (error) {
    if (!(error instanceof TypeError)) throw error
    const cached = await readOfflineData<T>(resource).catch(() => null)
    if (cached === null) throw error
    publishOfflineStatus({ cachedAt: cached.cachedAt, source: 'offline-cache' })
    return cached.value
  }
}

export function getOfflineStatus(): OfflineStatus {
  return offlineStatus
}

export function subscribeOfflineStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function publishOfflineStatus(nextStatus: OfflineStatus): void {
  offlineStatus = nextStatus
  for (const listener of listeners) listener()
}
