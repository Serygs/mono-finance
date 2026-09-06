import { createContext, use } from 'react'

import type { SessionUser } from './auth-api'

export interface AuthContextValue {
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  status: 'authenticated' | 'loading' | 'unauthenticated'
  user: SessionUser | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (context === null) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }
  return context
}
