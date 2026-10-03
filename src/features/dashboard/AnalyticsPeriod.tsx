import { useLocalization } from '../localization/localization'

export function AnalyticsPeriod({
  range,
}: {
  range: { dateFrom: number; dateTo: number } | null
}) {
  const { locale, t } = useLocalization()
  if (range === null) return null
  const format = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  const exact = t('Exact period: {from} – {to}', {
    from: format.format(range.dateFrom * 1000),
    to: format.format(range.dateTo * 1000),
  })
  const short = new Intl.DateTimeFormat(locale, { dateStyle: 'short' })
  return (
    <p className="analytics-period" title={exact}>
      <span aria-hidden="true">
        {t('Period: {from} – {to}', {
          from: short.format(range.dateFrom * 1000),
          to: short.format(range.dateTo * 1000),
        })}
      </span>
      <span className="sr-only">{exact}</span>
    </p>
  )
}
