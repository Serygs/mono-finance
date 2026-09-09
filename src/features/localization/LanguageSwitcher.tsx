import { useLocalization } from './localization'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocalization()
  return (
    <label className="language-switcher">
      <span className="sr-only">{t('Language')}</span>
      <select
        aria-label={t('Language')}
        name="language"
        onChange={(event) => setLocale(event.target.value as 'en' | 'uk')}
        value={locale}
      >
        <option value="en">EN</option>
        <option value="uk">UA</option>
      </select>
    </label>
  )
}
