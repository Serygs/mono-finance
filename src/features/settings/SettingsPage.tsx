import { Link } from 'react-router'

import { PageHeader, PageSurface } from '../../components/ui/Page'
import { CategoryManagement } from '../categories/CategoryManagement'
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
      <Link
        className="ui-button ui-button--secondary ui-button--medium"
        to="/system"
      >
        System status
      </Link>
    </PageSurface>
  )
}
