import type { ApiResponse } from '../types/api'
import {
  assertPrivateSession,
  endPrivateSession,
  privateSession,
} from '../features/auth/private-session'

/** Guard the entire response, including asynchronous body parsing, against session teardown. */
export async function fetchPrivateResponse(
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; json(): Promise<unknown> }> {
  if (!path.startsWith('/api/')) throw new Error('Invalid private API path.')
  const session = privateSession()
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    signal: options.signal
      ? AbortSignal.any([options.signal, session.signal])
      : session.signal,
  })
  assertPrivateSession(session.generation)
  if (response.status === 401) {
    endPrivateSession('unauthorized')
    assertPrivateSession(session.generation)
  }
  return {
    ok: response.ok,
    async json() {
      const payload = (await response.json()) as ApiResponse<unknown>
      assertPrivateSession(session.generation)
      return payload
    },
  }
}
