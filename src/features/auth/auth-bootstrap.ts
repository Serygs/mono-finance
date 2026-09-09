import type { AuthenticatedSession } from './auth-api'

const MAXIMUM_BROWSER_TIMEOUT_MILLISECONDS = 2_147_483_647

/**
 * Financial data may be read from the encrypted offline cache only after this
 * browser session has been verified by the server. A cached user identity is
 * not a substitute for an unexpired server-side session.
 */
export async function resolveInitialSession(
  loadCurrentSession: () => Promise<AuthenticatedSession | null>,
): Promise<AuthenticatedSession | null> {
  try {
    return await loadCurrentSession()
  } catch {
    return null
  }
}

export function sessionExpiryDelay(
  expiresAt: number,
  nowMilliseconds: number = Date.now(),
): number {
  return Math.min(
    MAXIMUM_BROWSER_TIMEOUT_MILLISECONDS,
    Math.max(0, expiresAt * 1_000 - nowMilliseconds),
  )
}
