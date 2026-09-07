import { CategoryManagement } from '../categories/CategoryManagement'
import { CurrencyPreferences } from './CurrencyPreferences'

export function SettingsPage() {
  return (
    <>
      <CurrencyPreferences />
      <CategoryManagement />
    </>
  )
}
