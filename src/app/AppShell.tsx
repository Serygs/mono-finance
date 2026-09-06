import { NavLink, Outlet } from 'react-router'

const navigationItems = [
  { label: 'Overview', to: '/' },
  { label: 'Settings', to: '/settings' },
] as const

export function AppShell() {
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
      </header>
      <main className="page-content">
        <Outlet />
      </main>
    </div>
  )
}
