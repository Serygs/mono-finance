import { FormField, Select } from '../../components/ui/FormControls'
import type { AccountFilter } from '../accounts/account-filter-storage'
import type { AccountSummary } from '../accounts/account-types'
import { AccountPicker } from '../accounts/AccountPicker'
import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'
import {
  availableCurrencies,
  type DashboardAnalytics,
  type DashboardDatePreset,
} from './dashboard-data'

const DATE_PRESETS: Array<{
  label: TranslationKey
  value: DashboardDatePreset
}> = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Current month', value: 'current-month' },
  { label: 'Previous month', value: 'previous-month' },
  { label: 'Current year', value: 'current-year' },
  { label: 'Custom range', value: 'custom' },
]
export function DashboardFilters({
  accounts,
  analytics,
  baseCurrency,
  currency,
  filter,
  from,
  mode,
  onCurrency,
  onFilter,
  onFiltersOpen,
  onFrom,
  onMode,
  onPreset,
  onTo,
  preset,
  filtersOpen,
  to,
}: {
  accounts: AccountSummary[]
  analytics: DashboardAnalytics | undefined
  baseCurrency: string
  currency: string | null
  filter: AccountFilter
  from: string
  mode: 'base' | 'original'
  onCurrency(value: string | null): void
  onFilter(value: AccountFilter): void
  onFiltersOpen(value: boolean): void
  onFrom(value: string): void
  onMode(value: 'base' | 'original'): void
  onPreset(value: DashboardDatePreset): void
  onTo(value: string): void
  preset: DashboardDatePreset
  filtersOpen: boolean
  to: string
}) {
  const { t } = useLocalization()
  const ids =
    filter.mode === 'all'
      ? accounts.map((account) => account.id)
      : filter.accountIds
  const chartCurrencies =
    analytics === undefined ? [] : availableCurrencies(analytics)
  return (
    <section className="dashboard-toolbar" aria-label={t('Dashboard filters')}>
      <FormField label={t('Period')}>
        <Select
          onChange={(event) =>
            onPreset(event.target.value as DashboardDatePreset)
          }
          value={preset}
        >
          {DATE_PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.label)}
            </option>
          ))}
        </Select>
      </FormField>
      <AccountPicker
        accounts={accounts}
        menuLabel={t('Accounts')}
        onChange={(selected) => {
          onFilter(
            selected.length === 0 || selected.length === accounts.length
              ? { mode: 'all' }
              : { accountIds: selected, mode: 'selected' },
          )
        }}
        selectAllLabel={t('Select all')}
        triggerLabel={
          ids.length === accounts.length
            ? t('All accounts ({count})', { count: accounts.length })
            : t('{count} accounts selected', { count: ids.length })
        }
        value={ids}
      />
      <FormField label={t('Currency')}>
        <Select
          onChange={(event) => {
            const value = event.target.value
            if (value === 'base') {
              onMode('base')
              onCurrency(null)
              return
            }
            onMode('original')
            onCurrency(value === 'original-all' ? null : value)
          }}
          value={mode === 'base' ? 'base' : (currency ?? 'original-all')}
        >
          <option value="original-all">{t('All original currencies')}</option>
          {chartCurrencies.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
          <option value="base">
            {baseCurrency} · {t('Base currency')}
          </option>
        </Select>
      </FormField>
      <div className={`dashboard-toolbar-menu${filtersOpen ? ' is-open' : ''}`}>
        <button
          aria-label={t('Filters')}
          aria-expanded={filtersOpen}
          className="dashboard-toolbar-menu__trigger"
          onClick={() => onFiltersOpen(!filtersOpen)}
          type="button"
        >
          <span aria-hidden="true">☷</span>
          {t('Filters')}
        </button>
        <div className="dashboard-toolbar-menu__content">
          <FormField
            className="dashboard-mobile-currency"
            label={t('Currency')}
          >
            <Select
              onChange={(event) => {
                const value = event.target.value
                if (value === 'base') {
                  onMode('base')
                  onCurrency(null)
                  return
                }
                onMode('original')
                onCurrency(value === 'original-all' ? null : value)
              }}
              value={mode === 'base' ? 'base' : (currency ?? 'original-all')}
            >
              <option value="original-all">
                {t('All original currencies')}
              </option>
              {chartCurrencies.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
              <option value="base">
                {baseCurrency} · {t('Base currency')}
              </option>
            </Select>
          </FormField>
          {preset === 'custom' ? (
            <div>
              <FormField label={t('From')}>
                <input
                  onChange={(event) => onFrom(event.target.value)}
                  type="date"
                  value={from}
                />
              </FormField>
              <FormField label={t('To')}>
                <input
                  onChange={(event) => onTo(event.target.value)}
                  type="date"
                  value={to}
                />
              </FormField>
            </div>
          ) : (
            <p className="dashboard-filter-hint">
              {t('Choose Custom range to set exact dates.')}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
