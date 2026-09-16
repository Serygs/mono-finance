import { CategoryManagement } from '../categories/CategoryManagement'
import { CategoryAnalytics } from '../categories/CategoryAnalytics'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { CurrencyPreferences } from './CurrencyPreferences'
import { SettingsSyncStatus } from './SettingsSyncStatus'
import { useLocalization } from '../localization/localization'
import { useAuth } from '../auth/auth-context'
import { SettingsGroup, SettingsRow } from './SettingsSections'
import { useLocation, useNavigate } from 'react-router'
import { SegmentedControl } from '../../components/ui/Controls'
import { THEME_MODES, useTheme } from '../theme/theme'

export function SettingsPage() {
  const { t } = useLocalization()
  const { mode, setMode } = useTheme()
  const { logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  if (location.hash === '#categories') {
    return (
      <PageSurface className="categories-page">
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
        <CategoryAnalytics />
        <CategoryManagement />
      </PageSurface>
    )
  }

  return (
    <PageSurface className="settings-page settings-page--grouped">
      <PageHeader
        description={
          <p>{t('Personalize your workspace and keep your data current.')}</p>
        }
        id="settings-title"
        title={t('More')}
      />
      <section aria-label="Mono Finance" className="settings-app-summary">
        <span aria-hidden="true" className="settings-app-summary__mark">
          MF
        </span>
        <div>
          <h2>Mono Finance</h2>
          <p>{t('Your finances, kept private.')}</p>
        </div>
      </section>
      <div className="settings-layout">
        <SettingsGroup title={t('Appearance')}>
          <SettingsRow
            className="settings-row--theme"
            icon="☼"
            {...(mode === 'system'
              ? { subtitle: t('Matches your device setting.') }
              : {})}
            title={t('Theme')}
            trailing={<ThemeControl mode={mode} onChange={setMode} />}
          />
          <LanguageSettingsRow />
          <CurrencyPreferences />
        </SettingsGroup>
        <SettingsGroup title={t('Data and sync')}>
          <SettingsSyncStatus />
        </SettingsGroup>
        <SettingsGroup title={t('App')}>
          <SettingsRow
            icon="i"
            subtitle={t('Your private personal finance workspace.')}
            title="Mono Finance"
          />
        </SettingsGroup>
      </div>
      <button
        className="settings-sign-out"
        onClick={() => void handleLogout()}
        type="button"
      >
        <span aria-hidden="true" className="settings-row__icon">
          ↪
        </span>
        <span className="settings-row__copy">
          <strong>{t('Sign out')}</strong>
          <small>{t('End this session on this device.')}</small>
        </span>
        <span aria-hidden="true" className="settings-row__chevron">
          ›
        </span>
      </button>
    </PageSurface>
  )
}

function ThemeControl({
  mode,
  onChange,
}: {
  mode: ReturnType<typeof useTheme>['mode']
  onChange: ReturnType<typeof useTheme>['setMode']
}) {
  const { t } = useLocalization()
  return (
    <SegmentedControl
      label={t('Theme')}
      onChange={onChange}
      options={THEME_MODES.map((value) => ({
        label: t(
          value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark',
        ),
        value,
      }))}
      value={mode}
    />
  )
}

function LanguageSettingsRow() {
  const { locale, setLocale, t } = useLocalization()

  return (
    <SettingsRow
      icon="◎"
      subtitle={t('App interface language.')}
      title={t('Language')}
      trailing={
        <select
          aria-label={t('Language')}
          className="ui-select settings-row__select"
          onChange={(event) => {
            if (event.target.value === 'en' || event.target.value === 'uk') {
              setLocale(event.target.value)
            }
          }}
          value={locale}
        >
          <option value="en">{t('English')}</option>
          <option value="uk">{t('Ukrainian')}</option>
        </select>
      }
    />
  )
}
