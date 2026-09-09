import { CategoryManagement } from '../categories/CategoryManagement'
import { CategorySourceManagement } from '../categories/CategorySourceManagement'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { CurrencyPreferences } from './CurrencyPreferences'
import { useLocalization } from '../localization/localization'

export function SettingsPage() {
  const { t } = useLocalization()
  return (
    <PageSurface className="settings-page">
      <PageHeader
        description={
          <p>
            {t(
              'Configure your analytics currency and personal classification.',
            )}
          </p>
        }
        eyebrow={t('Preferences')}
        id="settings-title"
        title={t('Settings')}
      />
      <CurrencyPreferences />
      <CategoryManagement />
      <CategorySourceManagement />
    </PageSurface>
  )
}
