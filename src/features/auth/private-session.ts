export type SessionEndReason = 'logout' | 'unauthorized' | 'expired'

let generation = 0
let authenticated = false
let expiresAtMilliseconds = 0
let controller = new AbortController()
const listeners = new Set<(reason: SessionEndReason) => void>()

export class SessionEndedError extends Error {
  constructor() {
    super('The private session has ended.')
  }
}

export function sessionGeneration(): number {
  return generation
}

export function activatePrivateSession(expiresAt: number): void {
  controller.abort()
  controller = new AbortController()
  generation++
  authenticated = true
  expiresAtMilliseconds = expiresAt * 1_000
}

export function endPrivateSession(reason: SessionEndReason): void {
  authenticated = false
  generation++
  controller.abort()
  controller = new AbortController()
  for (const listener of listeners) listener(reason)
}

export function subscribeSessionEnd(
  listener: (reason: SessionEndReason) => void,
): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function privateSession(): { generation: number; signal: AbortSignal } {
  assertPrivateSession(generation)
  return { generation, signal: controller.signal }
}

export function assertPrivateSession(expectedGeneration: number): void {
  if (authenticated && Date.now() >= expiresAtMilliseconds)
    endPrivateSession('expired')
  if (!authenticated || generation !== expectedGeneration)
    throw new SessionEndedError()
}
