import { createContext, use } from 'react'

import type { SessionUser } from './auth-api'
import type { TranslationKey } from '../localization/messages'

export interface AuthContextValue {
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
  retrySession(): Promise<void>
  retryCleanup(): Promise<void>
  cleanupFailed: boolean
  cleanupError: TranslationKey | null
  verificationError: TranslationKey | null
  status: 'authenticated' | 'loading' | 'unauthenticated' | 'unavailable'
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
