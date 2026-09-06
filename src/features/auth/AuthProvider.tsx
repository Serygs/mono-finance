import { useEffect, useMemo, useState, type ReactNode } from 'react'

import {
  getCurrentSession,
  login as loginRequest,
  logout as logoutRequest,
} from './auth-api'
import { AuthContext, type AuthContextValue } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthContextValue['user']>(null)

  useEffect(() => {
    let active = true
    void getCurrentSession()
      .then((currentUser) => {
        if (!active) {
          return
        }
        setUser(currentUser)
        setStatus(currentUser === null ? 'unauthenticated' : 'authenticated')
      })
      .catch(() => {
        if (active) {
          setUser(null)
          setStatus('unauthenticated')
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
        setUser(currentUser)
        setStatus('authenticated')
      },
      async logout() {
        await logoutRequest()
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
