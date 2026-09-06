import { Navigate, Route, Routes } from 'react-router'

import { AppShell } from './AppShell'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { SettingsPage } from '../features/settings/SettingsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Route>
    </Routes>
  )
}
