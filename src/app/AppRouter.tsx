import { Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { AuthProvider } from '../features/auth/AuthProvider'
import { LoginPage } from '../features/auth/LoginPage'
import { RequireAuthentication } from '../features/auth/RequireAuthentication'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { TransactionsPage } from '../features/transactions/TransactionsPage'
import { LocalizationProvider } from '../features/localization/localization'
import { ThemeProvider } from '../features/theme/theme'

export function AppRouter() {
  return (
    <ThemeProvider>
      <LocalizationProvider>
        <AuthProvider>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route element={<RequireAuthentication />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
                <Route path="transactions" element={<TransactionsPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate replace to="/" />} />
          </Routes>
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  )
}
