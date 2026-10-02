import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, SegmentedControl } from '../../components/ui/Controls'
import { FormField, Select } from '../../components/ui/FormControls'
import { Alert, EmptyState, Skeleton } from '../../components/ui/Feedback'
import { Popover } from '../../components/ui/Popover'
import { Icon } from '../../components/ui/Icon'
import { AccountPicker } from '../accounts/AccountPicker'
import { useAccountsQuery } from '../accounts/account-queries'
import { useDashboardFilters } from '../dashboard/use-dashboard-filters'
import { getAnalyticsBreakdowns } from '../dashboard/analytics-api'
import type { DashboardDatePreset } from '../dashboard/dashboard-data'
import { useLocalization } from '../localization/localization'
import { categoryQueryKeys } from './category-queries'
import { categoryRankings } from './category-ranking-data'
import { CategoryRanking } from './CategoryRanking'
import type { CustomCategory } from './categories-api'

const PRESETS = [
  ['30d', 'Last 30 days'],
  ['7d', 'Last 7 days'],
  ['90d', 'Last 90 days'],
  ['current-month', 'Current month'],
  ['previous-month', 'Previous month'],
  ['current-year', 'Current year'],
  ['custom', 'Custom range'],
] as const

export function CategoryAnalysis({
  active,
  categories,
}: {
  active: boolean
  categories: CustomCategory[]
}) {
  const { t } = useLocalization()
  const filters = useDashboardFilters()
  const accounts = useAccountsQuery()
  const [direction, setDirection] = useState<'expense' | 'income'>('expense')
  const request = useMemo(
    () =>
      filters.range === null || filters.range.dateFrom > filters.range.dateTo
        ? null
        : {
            accountIds: filters.accountIds,
            ...filters.range,
          },
    [filters.accountIds, filters.range],
  )
  const analysis = useQuery({
    enabled: active && request !== null,
    queryKey: categoryQueryKeys.analyticsFor(request),
    queryFn: () => getAnalyticsBreakdowns(request!),
  })
  const values =
    direction === 'expense'
      ? analysis.data?.expensesByCategory
      : analysis.data?.incomeByCategory
  const groups = categoryRankings(values ?? [])
  const units = new Map(
    (accounts.data ?? []).map((account) => [
      account.currency.code,
      account.currency.minorUnit,
    ]),
  )
  const ids =
    filters.filter.mode === 'all'
      ? (accounts.data ?? []).map((account) => account.id)
      : filters.filter.accountIds
  const filtered =
    filters.filter.mode === 'selected' || filters.preset === 'custom'
  function reset() {
    filters.setFilter({ mode: 'all' })
    filters.setPreset('30d')
    filters.setFrom('')
    filters.setTo('')
  }
  return (
    <section className="category-analysis" aria-label={t('Analysis')}>
      <div className="category-analysis-filters">
        <FormField label={t('Period')}>
          <Select
            value={filters.preset}
            onChange={(event) =>
              filters.setPreset(event.target.value as DashboardDatePreset)
            }
          >
            {PRESETS.map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </Select>
        </FormField>
        <AccountPicker
          accounts={accounts.data ?? []}
          menuLabel={t('Accounts')}
          selectAllLabel={t('Select all')}
          value={ids}
          triggerLabel={
            filters.filter.mode === 'all'
              ? t('All accounts ({count})', { count: ids.length })
              : t('{count} accounts selected', { count: ids.length })
          }
          onChange={(selected) =>
            filters.setFilter(
              selected.length === 0 || selected.length === accounts.data?.length
                ? { mode: 'all' }
                : { mode: 'selected', accountIds: selected },
            )
          }
        />
        <SegmentedControl<'expense' | 'income'>
          label={t('Direction')}
          value={direction}
          onChange={setDirection}
          options={[
            { value: 'expense', label: t('Expenses') },
            { value: 'income', label: t('Income') },
          ]}
        />
        <Popover
          mobileSheet
          label={t('Filters')}
          content={
            <div className="category-filter-options">
              <FormField label={t('From')}>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(event) => {
                    filters.setFrom(event.target.value)
                    filters.setPreset('custom')
                  }}
                />
              </FormField>
              <FormField label={t('To')}>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(event) => {
                    filters.setTo(event.target.value)
                    filters.setPreset('custom')
                  }}
                />
              </FormField>
              <Button variant="secondary" data-popover-dismiss onClick={reset}>
                {t('Reset filters')}
              </Button>
            </div>
          }
        >
          <Icon name="filters" />
          <span>{t('Filters')}</span>
          {filtered ? (
            <span
              aria-label={t('{count} active filters', {
                count:
                  Number(filters.filter.mode === 'selected') +
                  Number(filters.preset === 'custom'),
              })}
            >
              {Number(filters.filter.mode === 'selected') +
                Number(filters.preset === 'custom')}
            </span>
          ) : null}
        </Popover>
      </div>
      {request === null ? (
        <Alert tone="warning">{t('Choose a valid date range.')}</Alert>
      ) : (
        <>
          {analysis.isPending ? (
            <Skeleton label={t('Loading analytics…')} lines={5} />
          ) : null}
          {analysis.isError ? (
            <Alert tone="danger">
              {t('Analytics could not be loaded.')}{' '}
              <Button
                variant="secondary"
                loading={analysis.isFetching}
                onClick={() => void analysis.refetch()}
              >
                {t('Retry')}
              </Button>
            </Alert>
          ) : null}
          {analysis.data !== undefined &&
          groups.every((group) => group.total === 0n) ? (
            <EmptyState
              title={t(
                filtered
                  ? 'No categories match these filters.'
                  : direction === 'expense'
                    ? 'No expenses in this period.'
                    : 'No income in this period.',
              )}
              action={
                <Button variant="secondary" onClick={reset}>
                  {t('Reset filters')}
                </Button>
              }
            >
              <p>{t('Choose another period or account selection.')}</p>
            </EmptyState>
          ) : null}
          {groups
            .filter((group) => group.total > 0n)
            .map((group) => (
              <CategoryRanking
                key={`${direction}:${group.currencyCode}`}
                group={group}
                units={units}
                categories={categories}
                direction={direction}
              />
            ))}
          {analysis.data?.currencyConversion.missingRateTransactionCounts.some(
            (item) => item.count > 0,
          ) ? (
            <Alert tone="warning">
              {t(
                'Some transactions have no stored conversion rate. Original currencies remain separate.',
              )}
            </Alert>
          ) : null}
        </>
      )}
    </section>
  )
}
