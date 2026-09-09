import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth } from '../features/auth/auth-context'
import { OfflineStatus } from '../features/offline/OfflineStatus'
import { Button } from '../components/ui/Controls'
import { LanguageSwitcher } from '../features/localization/LanguageSwitcher'
import { useLocalization } from '../features/localization/localization'

export function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useLocalization()
  const navigationItems = [
    { label: t('Overview'), to: '/' },
    { label: t('Transactions'), to: '/transactions' },
    { label: t('Settings'), to: '/settings' },
  ] as const

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t('Skip to content')}
      </a>
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            MF
          </span>
          <NavLink
            className="brand"
            to="/"
            aria-label={t('Mono Finance overview')}
          >
            Mono Finance
          </NavLink>
        </div>
        <nav
          aria-label={t('Primary navigation')}
          className="desktop-navigation"
        >
          <ul className="primary-navigation">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-header-actions">
          <LanguageSwitcher />
          <Button
            className="sign-out-button"
            onClick={() => void handleLogout()}
            size="small"
            type="button"
            variant="quiet"
          >
            {t('Sign out')}
          </Button>
        </div>
      </header>
      <OfflineStatus />
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <nav aria-label={t('Primary navigation')} className="mobile-navigation">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
