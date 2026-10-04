import { Navigate, Route, Routes } from 'react-router'

import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuthentication } from '../features/auth/RequireAuthentication'
import { ThemeProvider } from '../features/theme/theme'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { AppShell } from './AppShell'
import { OverviewRoute, SettingsRoute } from './LegacyPageRoutes'

export function AppRouter() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route element={<RequireAuthentication />}>
            <Route element={<AppShell />}>
              <Route index element={<OverviewRoute />} />
              <Route path="transactions" element={<TransactionsPage />} />
              <Route path="settings" element={<SettingsRoute />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  )
}
