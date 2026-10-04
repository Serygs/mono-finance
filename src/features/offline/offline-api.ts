import { cacheOfflineData, readOfflineData } from './encrypted-offline-cache'
import {
  assertPrivateSession,
  privateSession,
  subscribeSessionEnd,
} from '../auth/private-session'

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
subscribeSessionEnd(() =>
  publishOfflineStatus({ cachedAt: null, source: null }),
)

export async function getOfflineApiData<T>(
  resource: string,
  loadFromNetwork: () => Promise<T>,
): Promise<T> {
  const session = privateSession()
  try {
    const value = await loadFromNetwork()
    assertPrivateSession(session.generation)
    try {
      await cacheOfflineData(resource, value)
      assertPrivateSession(session.generation)
      publishOfflineStatus({ cachedAt: Date.now(), source: 'network' })
    } catch {
      // IndexedDB can be unavailable in private browsing or unsupported browsers.
      // A live D1 response remains valid even when local offline storage is disabled.
    }
    assertPrivateSession(session.generation)
    return value
  } catch (error) {
    assertPrivateSession(session.generation)
    if (!(error instanceof TypeError)) throw error
    const cached = await readOfflineData<T>(resource).catch(() => null)
    assertPrivateSession(session.generation)
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
