import { useLocation } from 'react-router'
import { AccountsPage } from '../features/accounts/AccountsPage'
import { CategoriesPage } from '../features/categories/CategoriesPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SettingsPage } from '../features/settings/SettingsPage'

// Render hash destinations in place: query/hash state and history remain intact.
export function OverviewRoute() {
  const { hash } = useLocation()
  return hash === '#accounts' ? <AccountsPage /> : <DashboardPage />
}

export function SettingsRoute() {
  const { hash } = useLocation()
  return hash === '#categories' ? <CategoriesPage /> : <SettingsPage />
}
