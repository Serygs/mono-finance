import { Link, Outlet, useLocation, useNavigate } from 'react-router'

import { useAuth } from '../features/auth/auth-context'
import { OfflineStatus } from '../features/offline/OfflineStatus'
import { Button } from '../components/ui/Controls'
import { LanguageSwitcher } from '../features/localization/LanguageSwitcher'
import { useLocalization } from '../features/localization/localization'
import { Popover } from '../components/ui/Popover'

export function AppShell() {
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useLocalization()
  const navigationItems = [
    {
      active: location.pathname === '/' && location.hash === '',
      icon: '⌂',
      label: t('Overview'),
      to: '/',
    },
    {
      active: location.pathname === '/transactions',
      icon: '≡',
      label: t('Transactions'),
      to: '/transactions',
    },
    {
      active:
        location.pathname === '/settings' && location.hash === '#categories',
      icon: '◔',
      label: t('Categories'),
      to: '/settings#categories',
    },
    {
      active: location.pathname === '/' && location.hash === '#accounts',
      icon: '▱',
      label: t('Accounts'),
      to: '/#accounts',
    },
    {
      active: location.pathname === '/settings' && location.hash === '',
      icon: '•••',
      label: t('More'),
      to: '/settings',
    },
  ]

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
          <Link
            className="brand"
            to="/"
            aria-label={t('Mono Finance overview')}
          >
            Mono Finance
          </Link>
        </div>
        <nav
          aria-label={t('Primary navigation')}
          className="desktop-navigation"
        >
          <ul className="primary-navigation">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <Link
                  aria-current={item.active ? 'page' : undefined}
                  to={item.to}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="app-header-actions">
          <LanguageSwitcher />
          <Popover
            className="profile-menu"
            content={
              <Button
                className="profile-menu__sign-out"
                onClick={() => void handleLogout()}
                size="small"
                type="button"
                variant="quiet"
              >
                {t('Sign out')}
              </Button>
            }
            label={t('Profile')}
          >
            <span aria-hidden="true" className="profile-menu__avatar">
              MF
            </span>
          </Popover>
        </div>
      </header>
      <OfflineStatus />
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <nav aria-label={t('Primary navigation')} className="mobile-navigation">
        {navigationItems.map((item) => (
          <Link
            aria-current={item.active ? 'page' : undefined}
            key={item.to}
            to={item.to}
          >
            <span aria-hidden="true" className="mobile-navigation__icon">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
