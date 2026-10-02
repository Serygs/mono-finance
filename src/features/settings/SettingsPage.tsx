import { Button, SegmentedControl } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { PageHeader, PageSurface } from '../../components/ui/Page'
import { Popover } from '../../components/ui/Popover'
import { useLogout } from '../auth/use-logout'
import { LOCALES, useLocalization } from '../localization/localization'
import { THEME_MODES, useTheme } from '../theme/theme'
import { CurrencyPreferences } from './CurrencyPreferences'
import {
  SettingsGroup,
  SettingsRow,
  SettingsRowContent,
} from './SettingsSections'
import { SettingsSyncStatus } from './SettingsSyncStatus'

export function SettingsPage() {
  const { t, locale, setLocale } = useLocalization()
  const { mode, setMode } = useTheme()
  const logout = useLogout()

  return (
    <PageSurface className="settings-page">
      <PageHeader id="settings-title" title={t('More')} />
      <div className="settings-layout">
        <SettingsGroup title={t('Appearance')}>
          <div className="settings-row settings-row--theme">
            <span aria-hidden="true" className="settings-row__icon">
              <Icon name="theme" />
            </span>
            <SegmentedControl
              label={t('Theme')}
              onChange={setMode}
              options={THEME_MODES.map((value) => ({
                label: t(
                  value === 'system'
                    ? 'System'
                    : value === 'light'
                      ? 'Light'
                      : 'Dark',
                ),
                value,
              }))}
              value={mode}
            />
          </div>
          <Popover
            className="settings-row-popover"
            label={t('Language')}
            mobileSheet
            content={
              <div className="settings-language-options">
                {LOCALES.map((value) => (
                  <Button
                    key={value}
                    variant="quiet"
                    aria-pressed={locale === value}
                    data-popover-dismiss
                    onClick={() => setLocale(value)}
                  >
                    {t(value === 'en' ? 'English' : 'Ukrainian')}
                    {locale === value ? <Icon name="check" /> : null}
                  </Button>
                ))}
              </div>
            }
          >
            <SettingsRowContent
              icon="language"
              title={t('Language')}
              trailing={
                <>
                  <span>{t(locale === 'en' ? 'English' : 'Ukrainian')}</span>
                  <Icon name="down" />
                </>
              }
            />
          </Popover>
        </SettingsGroup>
        <SettingsGroup title={t('Analytics')}>
          <CurrencyPreferences />
        </SettingsGroup>
        <SettingsGroup title={t('Data and sync')}>
          <SettingsSyncStatus />
        </SettingsGroup>
        <SettingsGroup title={t('About')}>
          <SettingsRow
            icon="info"
            title="Mono Finance"
            subtitle={t('Your private personal finance workspace.')}
          />
        </SettingsGroup>
        <SettingsGroup title={t('Session')}>
          <button
            className="settings-sign-out settings-row"
            onClick={logout.signOut}
            disabled={logout.pending}
            aria-busy={logout.pending || undefined}
            type="button"
          >
            <span aria-hidden="true" className="settings-row__icon">
              <Icon name="logout" />
            </span>
            <span className="settings-row__copy">
              <strong>{t(logout.pending ? 'Signing out…' : 'Sign out')}</strong>
            </span>
          </button>
          {logout.pending ? (
            <p className="sr-only" role="status">
              {t('Signing out…')}
            </p>
          ) : null}
          {logout.failed ? (
            <Alert tone="danger">{t('Unable to sign out. Try again.')}</Alert>
          ) : null}
        </SettingsGroup>
      </div>
    </PageSurface>
  )
}
