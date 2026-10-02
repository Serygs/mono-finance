import { Button, SegmentedControl } from '../../components/ui/Controls'
import { Icon } from '../../components/ui/Icon'
import {
  FormField,
  SearchField,
  Select,
} from '../../components/ui/FormControls'
import { Popover } from '../../components/ui/Popover'
import { AccountPicker } from '../accounts/AccountPicker'
import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'
import type { TransactionDatePreset } from './transaction-filter-data'
import type { useTransactionLedger } from './use-transaction-ledger'

const DATE_PRESETS: { label: TranslationKey; value: TransactionDatePreset }[] =
  [
    { label: '7 days', value: '7d' },
    { label: '30 days', value: '30d' },
    { label: '90 days', value: '90d' },
    { label: 'This month', value: 'current-month' },
    { label: 'Previous month', value: 'previous-month' },
    { label: 'This year', value: 'current-year' },
    { label: 'Custom range', value: 'custom' },
  ]

const DIRECTION_OPTIONS = [
  { label: 'All', value: 'all' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Income', value: 'income' },
] as const

export function TransactionFilters({
  ledger,
}: {
  ledger: ReturnType<typeof useTransactionLedger>
}) {
  const { t } = useLocalization()
  const {
    datePreset,
    setDatePreset,
    customDateFrom,
    setCustomDateFrom,
    customDateTo,
    setCustomDateTo,
    accountIds,
    setAccountIds,
    category,
    setCategory,
    direction,
    setDirection,
    search,
    setSearch,
    accountsQuery,
    categories,
  } = ledger
  return (
    <section
      className="transactions-toolbar"
      aria-label={t('Transaction filters')}
    >
      <SearchField
        autoComplete="off"
        className="transactions-toolbar__search"
        label={t('Search merchant or description')}
        name="transaction-search"
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('Search transactions…')}
        value={search}
      />
      <TransactionDatePresetField
        className="transactions-toolbar__period"
        datePreset={datePreset}
        onChange={setDatePreset}
        t={t}
      />
      <AccountPicker
        accounts={accountsQuery.data ?? []}
        className="transactions-toolbar__account"
        onChange={(selected) =>
          setAccountIds(
            selected.length === (accountsQuery.data?.length ?? 0)
              ? []
              : selected,
          )
        }
        value={
          accountIds.length === 0
            ? (accountsQuery.data ?? []).map((account) => account.id)
            : accountIds
        }
        triggerLabel={
          accountIds.length === 0
            ? t('All accounts ({count})', {
                count: accountsQuery.data?.length ?? 0,
              })
            : t('{count} accounts selected', { count: accountIds.length })
        }
      />
      <Popover
        className="transactions-toolbar__more-filters"
        mobileSheet
        description={t('{count} active filters', {
          count: ledger.activeFilterCount,
        })}
        content={
          <div className="transactions-filter-popover">
            <p>
              {t('{count} active filters', { count: ledger.activeFilterCount })}
            </p>
            <CategoryField
              categories={categories}
              onChange={setCategory}
              t={t}
              value={category}
            />
            {datePreset === 'custom' ? (
              <CustomDateFields
                customDateFrom={customDateFrom}
                customDateTo={customDateTo}
                onFromChange={setCustomDateFrom}
                onToChange={setCustomDateTo}
                t={t}
              />
            ) : null}
            <Button
              disabled={ledger.activeFilterCount === 0}
              variant="secondary"
              onClick={ledger.resetFilters}
            >
              {t('Reset filters')}
            </Button>
          </div>
        }
        label={t('Filters')}
      >
        <Icon name="filters" />
        <span>{t('Filters')}</span>
        {ledger.activeFilterCount > 0 ? (
          <span className="transactions-filter-count">
            {ledger.activeFilterCount}
          </span>
        ) : null}
      </Popover>
      <SegmentedControl
        label={t('Direction')}
        onChange={(value) => setDirection(value === 'all' ? null : value)}
        options={DIRECTION_OPTIONS.map((option) => ({
          ...option,
          label: t(option.label),
        }))}
        value={direction ?? 'all'}
      />
    </section>
  )
}
function TransactionDatePresetField({
  className,
  datePreset,
  onChange,
  t,
}: {
  className?: string
  datePreset: TransactionDatePreset
  onChange(value: TransactionDatePreset): void
  t: ReturnType<typeof useLocalization>['t']
}) {
  return (
    <FormField className={className ?? ''} label={t('Date range')}>
      <Select
        onChange={(event) =>
          onChange(event.target.value as TransactionDatePreset)
        }
        value={datePreset}
      >
        {DATE_PRESETS.map((preset) => (
          <option key={preset.value} value={preset.value}>
            {t(preset.label)}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function CategoryField({
  categories,
  className,
  onChange,
  t,
  value,
}: {
  categories: string[]
  className?: string
  onChange(value: string | null): void
  t: ReturnType<typeof useLocalization>['t']
  value: string | null
}) {
  return (
    <FormField className={className ?? ''} label={t('Category')}>
      <Select
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ''}
      >
        <option value="">{t('All categories')}</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </Select>
    </FormField>
  )
}

function CustomDateFields({
  className,
  customDateFrom,
  customDateTo,
  onFromChange,
  onToChange,
  t,
}: {
  className?: string
  customDateFrom: string
  customDateTo: string
  onFromChange(value: string): void
  onToChange(value: string): void
  t: ReturnType<typeof useLocalization>['t']
}) {
  return (
    <div
      className={['transactions-custom-dates', className]
        .filter(Boolean)
        .join(' ')}
    >
      <FormField label={t('From')}>
        <input
          autoComplete="off"
          name="transactions-from"
          onChange={(event) => onFromChange(event.target.value)}
          type="date"
          value={customDateFrom}
        />
      </FormField>
      <FormField label={t('To')}>
        <input
          autoComplete="off"
          name="transactions-to"
          onChange={(event) => onToChange(event.target.value)}
          type="date"
          value={customDateTo}
        />
      </FormField>
    </div>
  )
}
