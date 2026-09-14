import { CategoryManagement } from '../categories/CategoryManagement'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { CurrencyPreferences } from './CurrencyPreferences'
import { SettingsSyncStatus } from './SettingsSyncStatus'
import { useLocalization } from '../localization/localization'
import { useLocation } from 'react-router'

export function SettingsPage() {
  const { t } = useLocalization()
  const location = useLocation()

  if (location.hash === '#categories') {
    return (
      <PageSurface className="categories-page categories-page--v4">
        <PageHeader
          description={
            <p>
              {t(
                'Use these for personal analytics. Imported Monobank and MCC categories remain unchanged.',
              )}
            </p>
          }
          id="categories-title"
          title={t('Categories')}
        />
        <CategoryManagement />
      </PageSurface>
    )
  }

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
      <SettingsSyncStatus />
      <CategoryManagement />
    </PageSurface>
  )
}
