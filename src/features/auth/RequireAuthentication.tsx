import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from './auth-context'

export function RequireAuthentication() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <main className="session-loading">Checking your secure session…</main>
    )
  }
  if (status === 'unauthenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }
  return <Outlet />
}
