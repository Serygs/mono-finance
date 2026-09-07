import { NavLink, Outlet, useNavigate } from 'react-router'

import { useAuth } from '../features/auth/auth-context'

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
      <header className="app-header">
        <NavLink className="brand" to="/" aria-label="Mono Finance overview">
          Mono Finance
        </NavLink>
        <nav aria-label="Primary navigation">
          <ul className="primary-navigation">
            {navigationItems.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to}>{item.label}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <button
          className="sign-out-button"
          onClick={() => void handleLogout()}
          type="button"
        >
          Sign out
        </button>
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
