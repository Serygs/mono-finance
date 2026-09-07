import { CategoryManagement } from '../categories/CategoryManagement'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { CurrencyPreferences } from './CurrencyPreferences'

export function SettingsPage() {
  return (
    <PageSurface className="settings-page">
      <PageHeader
        description={
          <p>Configure your analytics currency and personal classification.</p>
        }
        eyebrow="Preferences"
        id="settings-title"
        title="Settings"
      />
      <CurrencyPreferences />
      <CategoryManagement />
    </PageSurface>
  )
}
