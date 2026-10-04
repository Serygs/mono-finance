export type SessionEventType = 'logout' | 'unauthorized' | 'expired'
interface SessionEvent {
  id: string
  type: SessionEventType
}
const STORAGE_KEY = 'mono-finance-session-event-v1'
const CHANNEL_NAME = 'mono-finance-session-v1'

let channel: BroadcastChannel | null = null
const listeners = new Set<(type: SessionEventType) => void>()
const seen = new Set<string>()

function receive(value: unknown): void {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    typeof value.id !== 'string' ||
    !('type' in value) ||
    (value.type !== 'logout' &&
      value.type !== 'unauthorized' &&
      value.type !== 'expired') ||
    seen.has(value.id)
  )
    return
  seen.add(value.id)
  if (seen.size > 100) seen.delete(seen.values().next().value!)
  for (const listener of listeners) listener(value.type)
}

function storageEvent(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY || event.newValue === null) return
  try {
    receive(JSON.parse(event.newValue))
  } catch {
    /* Ignore malformed notifications. */
  }
}

export function subscribeSessionEvents(
  listener: (type: SessionEventType) => void,
): () => void {
  if (listeners.size === 0) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = (event: MessageEvent<unknown>) => receive(event.data)
    } catch {
      channel = null
    }
    window.addEventListener('storage', storageEvent)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      channel?.close()
      channel = null
      window.removeEventListener('storage', storageEvent)
    }
  }
}

export function publishSessionEvent(type: SessionEventType): void {
  const event: SessionEvent = { id: crypto.randomUUID(), type }
  seen.add(event.id)
  try {
    channel?.postMessage(event)
  } catch {
    /* Also attempt the storage transport. */
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(event))
  } catch {
    // BroadcastChannel still notifies other open tabs when storage is unavailable.
  }
}

export function readSessionEventType(): SessionEventType | null {
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY)
    if (serialized === null) return null
    const event: unknown = JSON.parse(serialized)
    if (
      typeof event === 'object' &&
      event !== null &&
      'type' in event &&
      (event.type === 'logout' ||
        event.type === 'expired' ||
        event.type === 'unauthorized')
    )
      return event.type
  } catch {
    /* Storage is optional; server verification still governs cold start. */
  }
  return null
}

export function clearSessionEvent(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* In-memory access remains gated. */
  }
}
