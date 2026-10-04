import type { TranslationKey } from '../localization/messages'

export interface SessionUser {
  email: string
  id: string
}

export interface AuthenticatedSession {
  expiresAt: number
  user: SessionUser
}

type AuthenticationErrorKind =
  'invalid-credentials' | 'rate-limited' | 'network' | 'server'

export class AuthenticationError extends Error {
  readonly kind: AuthenticationErrorKind
  constructor(kind: AuthenticationErrorKind) {
    super('Authentication request failed.')
    this.kind = kind
  }
}

export function authenticationErrorKey(error: unknown): TranslationKey {
  if (error instanceof AuthenticationError) {
    if (error.kind === 'invalid-credentials')
      return 'The email or password is not recognised.'
    if (error.kind === 'rate-limited')
      return 'Too many authentication attempts. Wait before trying again.'
    if (error.kind === 'network')
      return 'Unable to connect. Check your connection and try again.'
  }
  return 'Authentication is temporarily unavailable. Try again later.'
}

export async function getCurrentSession(): Promise<AuthenticatedSession | null> {
  const response = await authRequest('/api/auth/session')
  if (response.status === 401) {
    return null
  }
  assertSuccessfulResponse(response)
  return session(await readPayload(response))
}

export async function login(
  email: string,
  password: string,
): Promise<AuthenticatedSession> {
  const response = await authRequest('/api/auth/login', {
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  })
  if (response.status === 401)
    throw new AuthenticationError('invalid-credentials')
  assertSuccessfulResponse(response)
  return session(await readPayload(response))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function session(payload: unknown): AuthenticatedSession {
  const value = isObject(payload) ? payload['data'] : undefined
  if (
    !isObject(value) ||
    typeof value['expiresAt'] !== 'number' ||
    !Number.isSafeInteger(value['expiresAt']) ||
    value['expiresAt'] * 1_000 <= Date.now() ||
    !isObject(value['user']) ||
    typeof value['user']['email'] !== 'string' ||
    typeof value['user']['id'] !== 'string' ||
    value['user']['id'].length === 0
  )
    throw new AuthenticationError('server')
  return {
    expiresAt: value['expiresAt'],
    user: { email: value['user']['email'], id: value['user']['id'] },
  }
}

export async function logout(): Promise<void> {
  const response = await authRequest('/api/auth/logout', { method: 'POST' })
  // An absent/expired session is already signed out.
  if (response.status !== 401) assertSuccessfulResponse(response)
}

async function authRequest(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...options.headers },
    })
  } catch {
    throw new AuthenticationError('network')
  }
}

function assertSuccessfulResponse(response: Response): void {
  if (response.status === 429) throw new AuthenticationError('rate-limited')
  if (!response.ok) throw new AuthenticationError('server')
}

async function readPayload(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new AuthenticationError('server')
  }
}
