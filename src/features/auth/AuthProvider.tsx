import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'

import {
  authenticationErrorKey,
  getCurrentSession,
  login as loginRequest,
  logout as logoutRequest,
  type AuthenticatedSession,
} from './auth-api'
import { resolveInitialSession, sessionExpiryDelay } from './auth-bootstrap'
import {
  clearOfflineCache,
  OfflineCacheCleanupError,
} from '../offline/encrypted-offline-cache'
import { AuthContext, type AuthContextValue } from './auth-context'
import {
  activatePrivateSession,
  endPrivateSession,
  sessionGeneration,
  subscribeSessionEnd,
} from './private-session'
import {
  clearSessionEvent,
  publishSessionEvent,
  readSessionEventType,
  subscribeSessionEvents,
} from './session-events'

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient()
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')
  const [user, setUser] = useState<AuthContextValue['user']>(null)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [verificationError, setVerificationError] =
    useState<AuthContextValue['verificationError']>(null)
  const [cleanupError, setCleanupError] =
    useState<AuthContextValue['cleanupError']>(null)
  const cleanupFailed = cleanupError !== null
  const cleanupFailure = useRef(false)
  const cleanup = useRef<Promise<void> | null>(null)
  const verificationAttempt = useRef(0)

  const retryCleanup = useCallback(async () => {
    const task = cleanup.current ?? clearOfflineCache()
    cleanup.current = task
    try {
      await task
      cleanupFailure.current = false
      setCleanupError(null)
    } catch (error) {
      cleanupFailure.current = true
      setCleanupError(
        error instanceof OfflineCacheCleanupError && error.reason === 'blocked'
          ? 'Local data cleanup failed. Close other Mono Finance tabs and retry.'
          : 'Local data could not be removed. Check browser storage permissions and retry.',
      )
    } finally {
      if (cleanup.current === task) cleanup.current = null
    }
  }, [])

  const acceptSession = useCallback((session: AuthenticatedSession) => {
    clearSessionEvent()
    activatePrivateSession(session.expiresAt)
    setSessionExpiresAt(session.expiresAt)
    setUser(session.user)
    setVerificationError(null)
    setStatus('authenticated')
  }, [])

  const retrySession = useCallback(async () => {
    const attempt = ++verificationAttempt.current
    const generation = sessionGeneration()
    setStatus('loading')
    setVerificationError(null)
    try {
      const ended = readSessionEventType()
      if (ended !== null) {
        endPrivateSession(ended)
        return
      }
      const session = await resolveInitialSession(getCurrentSession)
      if (
        attempt !== verificationAttempt.current ||
        generation !== sessionGeneration()
      )
        return
      if (session === null) {
        endPrivateSession('unauthorized')
      } else {
        acceptSession(session)
      }
    } catch (error) {
      if (
        attempt !== verificationAttempt.current ||
        generation !== sessionGeneration()
      )
        return
      setVerificationError(authenticationErrorKey(error))
      setStatus('unavailable')
    }
  }, [acceptSession])

  useEffect(() => {
    let active = true
    const attempts = verificationAttempt
    const stopSession = subscribeSessionEnd((reason) => {
      verificationAttempt.current++
      setSessionExpiresAt(null)
      setUser(null)
      setVerificationError(null)
      setStatus('unauthenticated')
      // Cancel first so a query's late result cannot repopulate the cleared cache.
      void client.cancelQueries()
      client.clear()
      void retryCleanup()
      // Broadcast only local events. Remote events use the same teardown without echoing.
      if (!receivingRemoteEvent) publishSessionEvent(reason)
    })
    let receivingRemoteEvent = false
    const stopEvents = subscribeSessionEvents((reason) => {
      receivingRemoteEvent = true
      endPrivateSession(reason)
      receivingRemoteEvent = false
    })
    void Promise.resolve().then(() => {
      if (active) return retrySession()
    })
    return () => {
      active = false
      attempts.current++
      stopEvents()
      stopSession()
    }
  }, [client, retryCleanup, retrySession])

  useEffect(() => {
    if (sessionExpiresAt === null) return
    const timeout = window.setTimeout(() => {
      endPrivateSession('expired')
    }, sessionExpiryDelay(sessionExpiresAt))
    return () => window.clearTimeout(timeout)
  }, [sessionExpiresAt])

  const value = useMemo<AuthContextValue>(
    () => ({
      async login(email, password) {
        if (cleanupFailure.current)
          throw new Error('Offline cache cleanup is required.')
        await cleanup.current
        const generation = sessionGeneration()
        const session = await loginRequest(email, password)
        if (generation !== sessionGeneration())
          throw new Error('The session changed during sign in.')
        acceptSession(session)
      },
      async logout() {
        try {
          await logoutRequest()
        } catch (error) {
          // A failed request does not confirm server revocation.
          await retryCleanup()
          throw error
        }
        endPrivateSession('logout')
      },
      retrySession,
      retryCleanup,
      cleanupFailed,
      cleanupError,
      verificationError,
      status,
      user,
    }),
    [
      acceptSession,
      cleanupFailed,
      cleanupError,
      retryCleanup,
      retrySession,
      status,
      user,
      verificationError,
    ],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
