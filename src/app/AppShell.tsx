import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth } from '../features/auth/auth-context'
import { OfflineStatus } from '../features/offline/OfflineStatus'
import { Button } from '../components/ui/Controls'

const navigationItems = [
  { label: 'Overview', to: '/' },
  { label: 'Transactions', to: '/transactions' },
  { label: 'Settings', to: '/settings' },
] as const

export function AppShell() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            MF
          </span>
          <NavLink className="brand" to="/" aria-label="Mono Finance overview">
            Mono Finance
          </NavLink>
        </div>
        <nav aria-label="Primary navigation" className="desktop-navigation">
          <ul className="primary-navigation">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <Button
          className="sign-out-button"
          onClick={() => void handleLogout()}
          size="small"
          type="button"
          variant="quiet"
        >
          Sign out
        </Button>
      </header>
      <OfflineStatus />
      <main className="page-content" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
      <nav aria-label="Mobile navigation" className="mobile-navigation">
        {navigationItems.map((item) => (
          <NavLink key={item.to} to={item.to}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
