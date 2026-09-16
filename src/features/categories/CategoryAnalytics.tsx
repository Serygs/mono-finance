import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { SegmentedControl } from '../../components/ui/Controls'
import { EmptyState, Skeleton } from '../../components/ui/Feedback'
import { FormField, Select } from '../../components/ui/FormControls'
import { getAccounts } from '../accounts/accounts-api'
import { getCurrencyPreferences } from '../settings/currency-preferences-api'
import {
  getAnalyticsBreakdowns,
  type CurrencyAmount,
} from '../dashboard/analytics-api'
import {
  formatCurrencyAmount,
  resolveDashboardRange,
  type DashboardDatePreset,
} from '../dashboard/dashboard-data'
import { useLocalization } from '../localization/localization'
import type { TranslationKey } from '../localization/messages'
import {
  resolveCategoryVisual,
  resolveDefaultVisual,
} from '../visuals/visual-resolver'
import { getCategories, getCategorySources } from './categories-api'
import { getVisibleCategoryLegend } from './category-analytics-data'

type Direction = 'expense' | 'income'

const PERIODS: Array<{ label: TranslationKey; value: DashboardDatePreset }> = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

export function CategoryAnalytics() {
  const { locale, t } = useLocalization()
  const [preset, setPreset] = useState<DashboardDatePreset>('30d')
  const [accountId, setAccountId] = useState('')
  const [direction, setDirection] = useState<Direction>('expense')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [exitingKey, setExitingKey] = useState<string | null>(null)
  const range = useMemo(() => resolveDashboardRange(preset, '', ''), [preset])
  const accounts = useQuery({ queryFn: getAccounts, queryKey: ['accounts'] })
  const currencies = useQuery({
    queryFn: getCurrencyPreferences,
    queryKey: ['currency-preferences'],
  })
  const categories = useQuery({
    queryFn: getCategories,
    queryKey: ['categories'],
  })
  const sourceTotal = useQuery({
    queryFn: () =>
      getCategorySources({ mapping: 'all', page: 1, pageSize: 1, query: '' }),
    queryKey: ['category-sources', 'summary', 'all'],
  })
  const configuredSources = useQuery({
    queryFn: () =>
      getCategorySources({
        mapping: 'mapped',
        page: 1,
        pageSize: 1,
        query: '',
      }),
    queryKey: ['category-sources', 'summary', 'mapped'],
  })
  const filters = useMemo(
    () =>
      range === null
        ? null
        : {
            accountIds: accountId === '' ? [] : [accountId],
            baseCurrencyCode: currencies.data?.baseCurrencyCode ?? 'UAH',
            dateFrom: range.dateFrom,
            dateTo: range.dateTo,
          },
    [accountId, currencies.data?.baseCurrencyCode, range],
  )
  const analytics = useQuery({
    enabled: filters !== null,
    queryFn: () => getAnalyticsBreakdowns(filters!),
    queryKey: ['category-analytics', filters],
  })
  const values = useMemo(() => {
    const raw =
      direction === 'expense'
        ? (analytics.data?.expensesByCategory ?? [])
        : (analytics.data?.incomeByCategory ?? [])
    const customById = new Map(
      (categories.data ?? []).map((item) => [item.id, item]),
    )
    return raw
      .map((item) => {
        const custom =
          item.categoryId === null ? undefined : customById.get(item.categoryId)
        const visual =
          custom === undefined
            ? resolveDefaultVisual({
                categoryName: item.categoryName,
                fallbackKey: item.categoryId ?? item.categoryName,
              })
            : resolveCategoryVisual(custom)
        return {
          ...item,
          key: `${item.categoryId ?? 'source'}:${item.categoryName}`,
          visual,
        }
      })
      .sort((left, right) => right.amountMinor - left.amountMinor)
  }, [analytics.data, categories.data, direction])
  const total = values.reduce((sum, item) => sum + item.amountMinor, 0)
  const top = values.slice(0, 5)
  const visibleLegend = getVisibleCategoryLegend(values, selectedKey)
  const exiting = values.find((item) => item.key === exitingKey)
  const legend =
    exiting === undefined ||
    visibleLegend.some((item) => item.key === exiting.key)
      ? visibleLegend
      : visibleLegend.concat(exiting)
  const configuredCount = configuredSources.data?.totalItems ?? 0
  const sourceCount = sourceTotal.data?.totalItems ?? 0
  const configuredPercent =
    sourceCount === 0 ? 0 : Math.round((configuredCount / sourceCount) * 100)
  const largestExpense = [...(analytics.data?.expensesByCategory ?? [])].sort(
    (left, right) => right.amountMinor - left.amountMinor,
  )[0]
  const expenseTotal = (analytics.data?.expensesByCategory ?? []).reduce(
    (sum, item) => sum + item.amountMinor,
    0,
  )
  const selectCategory = (key: string | null) => {
    if (
      selectedKey !== null &&
      selectedKey !== key &&
      !top.some((item) => item.key === selectedKey)
    )
      setExitingKey(selectedKey)
    setSelectedKey(key)
  }

  useEffect(() => {
    if (exitingKey === null) return undefined
    const timeout = window.setTimeout(() => setExitingKey(null), 180)
    return () => window.clearTimeout(timeout)
  }, [exitingKey])

  return (
    <section
      className="category-analytics"
      aria-labelledby="category-analytics-title"
    >
      <h2 className="sr-only" id="category-analytics-title">
        {t('Category analytics')}
      </h2>
      <div className="category-analytics__controls">
        <FormField label={t('Period')}>
          <Select
            onChange={(event) =>
              setPreset(event.target.value as DashboardDatePreset)
            }
            value={preset}
          >
            {PERIODS.map((item) => (
              <option key={item.value} value={item.value}>
                {t(item.label)}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={t('Account')}>
          <Select
            onChange={(event) => setAccountId(event.target.value)}
            value={accountId}
          >
            <option value="">{t('All accounts')}</option>
            {(accounts.data ?? []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.type} · {account.currency.code}
              </option>
            ))}
          </Select>
        </FormField>
        <SegmentedControl
          label={t('Direction')}
          onChange={(value) => setDirection(value as Direction)}
          options={[
            { label: t('Expenses'), value: 'expense' },
            { label: t('Income'), value: 'income' },
          ]}
          value={direction}
        />
      </div>
      <div className="category-analytics__summary">
        <SummaryCard
          icon="▦"
          label={t('Total source types')}
          value={sourceTotal.isPending ? '—' : String(sourceCount)}
          tone="blue"
        />
        <SummaryCard
          icon="✓"
          label={t('Configured source types')}
          value={
            configuredSources.isPending
              ? '—'
              : `${configuredCount} · ${configuredPercent}%`
          }
          tone="mint"
        />
        <SummaryCard
          {...(largestExpense === undefined || expenseTotal === 0
            ? {}
            : {
                detail: `${Math.round((largestExpense.amountMinor / expenseTotal) * 100)}%`,
              })}
          icon="↗"
          label={t('Largest expense category')}
          value={largestExpense?.categoryName ?? '—'}
          tone="violet"
        />
      </div>
      <section className="category-distribution ui-card">
        <header className="ui-card__header">
          <h2>
            {t(
              direction === 'expense'
                ? 'Expense distribution'
                : 'Income distribution',
            )}
          </h2>
          <strong>
            {total === 0
              ? '—'
              : formatCurrencyAmount(
                  total,
                  filters?.baseCurrencyCode ?? 'UAH',
                  2,
                  locale,
                )}
          </strong>
        </header>
        {analytics.isPending ? (
          <Skeleton label={t('Loading analytics…')} lines={4} />
        ) : null}
        {!analytics.isPending && total === 0 ? (
          <EmptyState title={t('No expenses in this period.')}>
            <span />
          </EmptyState>
        ) : null}
        {total > 0 ? (
          <div className="category-distribution__content">
            <Donut
              ariaLabel={t(
                direction === 'expense'
                  ? 'Expense distribution'
                  : 'Income distribution',
              )}
              values={values}
              selectedKey={selectedKey}
              setSelectedKey={selectCategory}
              total={total}
            />
            <ul className="category-distribution__legend">
              {legend.map((item) => (
                <LegendRow
                  item={item}
                  key={item.key}
                  selected={item.key === selectedKey}
                  exiting={item.key === exitingKey}
                  temporary={
                    selectedKey !== null &&
                    item.key === selectedKey &&
                    !top.some((topItem) => topItem.key === item.key)
                  }
                  total={total}
                  onSelect={() => selectCategory(item.key)}
                />
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </section>
  )
}

function SummaryCard({
  detail,
  icon,
  label,
  tone,
  value,
}: {
  detail?: string
  icon: string
  label: string
  tone: string
  value: string
}) {
  return (
    <article className={`category-summary-card category-summary-card--${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <small>{label}</small>
        <strong title={value}>{value}</strong>
        {detail === undefined ? null : <em>{detail}</em>}
      </div>
    </article>
  )
}

type CategoryValue = CurrencyAmount & {
  categoryId: string | null
  categoryName: string
  key: string
  visual: ReturnType<typeof resolveDefaultVisual>
}

function LegendRow({
  exiting,
  item,
  onSelect,
  selected,
  temporary,
  total,
}: {
  exiting: boolean
  item: CategoryValue
  onSelect(): void
  selected: boolean
  temporary: boolean
  total: number
}) {
  const percent = Math.round((item.amountMinor / total) * 100)
  return (
    <li
      className={[
        selected ? 'is-selected' : undefined,
        temporary ? 'is-temporary' : undefined,
        exiting ? 'is-exiting' : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button onClick={onSelect} type="button">
        <i className={`ui-entity-visual--${item.visual.colorToken}`} />
        <span title={item.categoryName}>{item.categoryName}</span>
        <b>{formatCurrencyAmount(item.amountMinor, item.currencyCode)}</b>
        <small>{percent}%</small>
      </button>
    </li>
  )
}

function Donut({
  ariaLabel,
  selectedKey,
  setSelectedKey,
  total,
  values,
}: {
  ariaLabel: string
  selectedKey: string | null
  setSelectedKey(value: string | null): void
  total: number
  values: CategoryValue[]
}) {
  const segments = values.reduce<
    Array<{ end: number; item: CategoryValue; start: number }>
  >((result, item) => {
    const start = result.at(-1)?.end ?? -Math.PI / 2
    return result.concat({
      end: start + (item.amountMinor / total) * Math.PI * 2,
      item,
      start,
    })
  }, [])
  return (
    <svg
      aria-label={ariaLabel}
      className="category-donut"
      role="img"
      viewBox="0 0 120 120"
    >
      {segments.map(({ end, item, start }) => {
        const path = arcPath(start, end)
        const selected = selectedKey === null || selectedKey === item.key
        return (
          <path
            className={`category-donut__segment ui-entity-visual--${item.visual.colorToken}${selected ? '' : ' is-dimmed'}`}
            d={path}
            key={item.key}
            onBlur={() => setSelectedKey(null)}
            onClick={() => setSelectedKey(item.key)}
            onFocus={() => setSelectedKey(item.key)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelectedKey(item.key)
              }
            }}
            onMouseEnter={() => setSelectedKey(item.key)}
            onMouseLeave={() => setSelectedKey(null)}
            role="button"
            tabIndex={0}
          />
        )
      })}
      <circle cx="60" cy="60" r="31" className="category-donut__hole" />
    </svg>
  )
}

function arcPath(start: number, end: number) {
  const x1 = 60 + 48 * Math.cos(start)
  const y1 = 60 + 48 * Math.sin(start)
  const x2 = 60 + 48 * Math.cos(end)
  const y2 = 60 + 48 * Math.sin(end)
  return `M ${x1} ${y1} A 48 48 0 ${end - start > Math.PI ? 1 : 0} 1 ${x2} ${y2} L 60 60 Z`
}
