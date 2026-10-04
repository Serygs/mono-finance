import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from './auth-context'
import { SessionRecovery } from './SessionRecovery'

export function RequireAuthentication() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading' || status === 'unavailable')
    return <SessionRecovery />
  if (status === 'unauthenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }
  return <Outlet />
}
