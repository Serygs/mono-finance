import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from './auth-context'
import { useLocalization } from '../localization/localization'

export function RequireAuthentication() {
  const { status } = useAuth()
  const location = useLocation()
  const { t } = useLocalization()

  if (status === 'loading') {
    return (
      <main className="session-loading">
        {t('Checking your secure session…')}
      </main>
    )
  }
  if (status === 'unauthenticated') {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }
  return <Outlet />
}
