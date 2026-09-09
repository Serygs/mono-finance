import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  getCurrentSession,
  login as loginRequest,
  logout as logoutRequest,
} from './auth-api'
import { resolveInitialSession, sessionExpiryDelay } from './auth-bootstrap'
import { clearOfflineCache } from '../offline/encrypted-offline-cache'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    void resolveInitialSession(getCurrentSession).then(async (session) => {
      if (!active) {
        return
      }
      if (session === null) {
        await clearOfflineCache().catch(() => undefined)
      }
      setSessionExpiresAt(session?.expiresAt ?? null)
      setUser(session?.user ?? null)
      setStatus(session === null ? 'unauthenticated' : 'authenticated')
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (sessionExpiresAt === null) return
    const timeout = window.setTimeout(() => {
      void clearOfflineCache().catch(() => undefined)
      setSessionExpiresAt(null)
      setUser(null)
      setStatus('unauthenticated')
    }, sessionExpiryDelay(sessionExpiresAt))
    return () => window.clearTimeout(timeout)
  }, [sessionExpiresAt])

  const value = useMemo<AuthContextValue>(
    () => ({
      async login(email, password) {
        const session = await loginRequest(email, password)
        setSessionExpiresAt(session.expiresAt)
        setUser(session.user)
        setStatus('authenticated')
      },
      async logout() {
        try {
          await logoutRequest()
        } finally {
          await clearOfflineCache().catch(() => undefined)
        }
        setSessionExpiresAt(null)
        setUser(null)
        setStatus('unauthenticated')
      },
      status,
      user,
    }),
    [status, user],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
