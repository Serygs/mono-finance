import { useLocalization } from '../localization/localization'
import { Popover } from '../../components/ui/Popover'
import type { ReactNode } from 'react'

export function AnalyticsPeriod({
  range,
  children,
}: {
  range: { dateFrom: number; dateTo: number } | null
  children?: ReactNode
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
    <Popover
      className="analytics-period"
      label={t('Period')}
      description={exact}
      mobileSheet
      content={
        <div className="analytics-period-details">
          <p>{exact}</p>
          {children}
        </div>
      }
    >
      <span>
        {short.format(range.dateFrom * 1000)} –{' '}
        {short.format(range.dateTo * 1000)}
      </span>
    </Popover>
  )
}
