import { useState } from 'react'
import { MoneyText } from '../../components/ui/MoneyText'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { Button } from '../../components/ui/Controls'
import { InfoTooltip } from '../../components/ui/Surfaces'
import { formatMoney } from '../../lib/money-presentation'
import { minorRatioPercent } from '../dashboard/dashboard-chart-presentation'
import { useLocalization } from '../localization/localization'
import { resolveCategoryAppearance } from './category-appearance'
import {
  categoryDefaultColor,
  type categoryRankings,
} from './category-ranking-data'
import type { CustomCategory } from './categories-api'

export function CategoryRanking({
  group,
  categories,
  units,
  direction,
}: {
  group: ReturnType<typeof categoryRankings>[number]
  categories: CustomCategory[]
  units: Map<string, number>
  direction: 'expense' | 'income'
}) {
  const { locale, t } = useLocalization()
  const [expanded, setExpanded] = useState(false)
  const minorUnit =
    units.get(group.currencyCode) ??
    (/^[A-Z]{3}$/.test(group.currencyCode)
      ? (new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: group.currencyCode,
        }).resolvedOptions().maximumFractionDigits ?? 2)
      : 0)
  const money = (amount: bigint) => {
    const formatted = formatMoney(amount, {
      currencyCode: group.currencyCode,
      minorUnit,
      locale,
      unknownMinorUnitsLabel: t('minor units'),
    })
    return <MoneyText value={formatted} locale={locale} />
  }
  const percent = (amount: bigint) => {
    const ratio = parseFloat(minorRatioPercent(amount, group.total))
    const format = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 1,
    })
    return amount > 0n && ratio < 0.1
      ? t('Less than {percent}', { percent: format.format(0.1) })
      : format.format(ratio)
  }
  const largest = group.all[0]!
  return (
    <section className="category-ranking" aria-label={group.currencyCode}>
      <header className="category-analysis-summary">
        <div>
          <InfoTooltip
            label={t(direction === 'expense' ? 'Total spent' : 'Total income')}
            description={t(
              'Category totals use effective transactions, excluding excluded records. Currencies are shown separately.',
            )}
          >
            {t(direction === 'expense' ? 'Total spent' : 'Total income')} ·{' '}
            {group.currencyCode}
          </InfoTooltip>
          <strong>{money(group.total)}</strong>
        </div>
        {group.total > 0n ? (
          <div>
            <span>
              {t(
                direction === 'expense'
                  ? 'Largest expense category'
                  : 'Largest income category',
              )}
            </span>
            <b>{largest.categoryName}</b>
            <small>
              {money(largest.amountMinor)} · {percent(largest.amountMinor)}%
            </small>
          </div>
        ) : null}
      </header>
      <ol className="category-ranking-list">
        {(expanded ? group.all : group.leading).map((row) => {
          const appearance = resolveCategoryAppearance(
            categories.find((category) => category.id === row.categoryId),
          )
          const color =
            appearance.colorToken ??
            categoryDefaultColor(row.categoryId ?? row.categoryName)
          return (
            <li key={row.key}>
              <span
                className={`category-visual ui-visual--${color}`}
                aria-hidden="true"
              >
                <CategoryIcon token={appearance.icon ?? 'wallet'} />
              </span>
              <div className="category-ranking-copy">
                <div>
                  <span>{row.categoryName}</span>
                  <strong>{money(row.amountMinor)}</strong>
                </div>
                <div className="category-ranking-track" aria-hidden="true">
                  <i
                    className={`ui-visual--${color}`}
                    style={{
                      width: `${minorRatioPercent(row.amountMinor, largest.amountMinor)}%`,
                      minWidth: row.amountMinor > 0n ? 2 : 0,
                    }}
                  />
                </div>
                <small>
                  {t(
                    direction === 'expense'
                      ? '{percent}% of category spending'
                      : '{percent}% of category income',
                    { percent: percent(row.amountMinor) },
                  )}
                </small>
              </div>
            </li>
          )
        })}
      </ol>
      {!expanded && group.all.length > 5 ? (
        <div className="category-ranking-other">
          <span>
            {t('Other categories')}
            <small>
              {t('{count} categories', { count: group.all.length - 5 })}
            </small>
          </span>
          <strong>
            {money(group.other)}
            <small>{percent(group.other)}%</small>
          </strong>
        </div>
      ) : null}
      {group.all.length > 5 ? (
        <Button
          variant="quiet"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {t(expanded ? 'Show leading categories' : 'View all categories')}
        </Button>
      ) : null}
    </section>
  )
}
