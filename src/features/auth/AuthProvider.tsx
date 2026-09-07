import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  getCurrentSession,
  login as loginRequest,
  logout as logoutRequest,
} from './auth-api'
import {
  clearOfflineCache,
  readOfflineSession,
  saveOfflineSession,
} from '../offline/encrypted-offline-cache'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthContextValue['user']>(null)

  useEffect(() => {
    let active = true
    void getCurrentSession()
      .then(async (currentUser) => {
        if (!active) {
          return
        }
        if (currentUser !== null) {
          await saveOfflineSession(currentUser).catch(() => undefined)
        } else {
          await clearOfflineCache().catch(() => undefined)
        }
        setUser(currentUser)
        setStatus(currentUser === null ? 'unauthenticated' : 'authenticated')
      })
      .catch(async (error: unknown) => {
        if (!active) return
        if (!(error instanceof TypeError)) {
          setUser(null)
          setStatus('unauthenticated')
          return
        }
        try {
          const cachedSession =
            await readOfflineSession<AuthContextValue['user']>()
          if (!active || cachedSession === null) return
          setUser(cachedSession.value)
          setStatus('authenticated')
        } catch {
          if (active) {
            setUser(null)
            setStatus('unauthenticated')
          }
        }
      })

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      async login(email, password) {
        const currentUser = await loginRequest(email, password)
        await saveOfflineSession(currentUser).catch(() => undefined)
        setUser(currentUser)
        setStatus('authenticated')
      },
      async logout() {
        try {
          await logoutRequest()
        } finally {
          await clearOfflineCache().catch(() => undefined)
        }
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
