import type { ApiResponse } from '../../types/api'

export interface SessionUser {
  email: string
  id: string
}

interface SessionResponse {
  user: SessionUser
}

export async function getCurrentSession(): Promise<SessionUser | null> {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error('Unable to check the current session.')
  }

  const payload = (await response.json()) as ApiResponse<SessionResponse>
  return 'data' in payload ? payload.data.user : null
}

export async function login(
  email: string,
  password: string,
): Promise<SessionUser> {
  const response = await fetch('/api/auth/login', {
    body: JSON.stringify({ email, password }),
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    method: 'POST',
  })
  const payload = (await response.json()) as ApiResponse<SessionResponse>
  if (!response.ok || !('data' in payload)) {
    throw new Error('Invalid email or password.')
  }
  return payload.data.user
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    method: 'POST',
  })
  if (!response.ok) {
    throw new Error('Unable to sign out.')
  }
}
