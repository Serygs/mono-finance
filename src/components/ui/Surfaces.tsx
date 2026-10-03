import { useId, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Popover } from './Popover'
import { Icon } from './Icon'

type Accent = 'cyan' | 'blue' | 'green' | 'violet' | 'pink'

interface CardProps {
  actions?: ReactNode
  children: ReactNode
  className?: string
  title?: ReactNode
}

export function Card({ actions, children, className, title }: CardProps) {
  return (
    <section className={['ui-card', className].filter(Boolean).join(' ')}>
      {title === undefined && actions === undefined ? null : (
        <header className="ui-card__header">
          {title === undefined ? null : <h2>{title}</h2>}
          {actions}
        </header>
      )}
      <div className="ui-card__body">{children}</div>
    </section>
  )
}

export function InfoTooltip({
  description,
  label,
  children,
}: {
  description: string
  label: string
  children?: ReactNode
}) {
  return (
    <Popover
      className={children === undefined ? 'ui-info-tooltip' : 'ui-label-help'}
      openOnFocusHover
      label={label}
      content={<p className="ui-help-description">{description}</p>}
    >
      {children ?? <Icon name="info" />}
    </Popover>
  )
}

interface KpiCardProps {
  accent?: Accent
  context?: ReactNode
  label: string
  description?: string
  icon?: ReactNode
  value: ReactNode
  drillDown?: {
    label: string
    destinations: { label: string; to: string }[]
  }
}

export function KpiCard({
  accent = 'cyan',
  context,
  description,
  drillDown,
  icon,
  label,
  value,
}: KpiCardProps) {
  const destinations = drillDown?.destinations ?? []
  const amount = (
    <span className="ui-kpi__value">
      <span className="ui-kpi__amounts">{value}</span>
      {destinations.length === 0 ? null : (
        <Icon className="ui-kpi__chevron" name="chevron" />
      )}
    </span>
  )
  return (
    <section className={`ui-kpi ui-kpi--${accent}`}>
      <header className="ui-kpi__header">
        <h2>{label}</h2>
        {icon === undefined ? null : (
          <span aria-hidden="true" className="ui-kpi__icon">
            {icon}
          </span>
        )}
      </header>
      {destinations.length === 1 ? (
        <Link
          className="ui-kpi__action"
          to={destinations[0]!.to}
          aria-label={destinations[0]!.label}
        >
          {amount}
        </Link>
      ) : destinations.length > 1 ? (
        <Popover
          className="ui-kpi__picker"
          label={drillDown!.label}
          content={
            <div className="ui-kpi__destinations">
              {destinations.map((destination) => (
                <Link
                  key={destination.to}
                  to={destination.to}
                  data-popover-dismiss
                >
                  {destination.label}
                </Link>
              ))}
            </div>
          }
        >
          {amount}
        </Popover>
      ) : (
        amount
      )}
      {description === undefined ? null : (
        <span className="ui-kpi__help">
          <InfoTooltip description={description} label={label} />
        </span>
      )}
      {context === undefined ? null : (
        <div className="ui-kpi__context">{context}</div>
      )}
    </section>
  )
}

interface ChartContainerProps {
  children: ReactNode
  className?: string
  summary: string
  title: string
}

export function ChartContainer({
  children,
  className,
  summary,
  title,
}: ChartContainerProps) {
  const summaryId = useId()
  return (
    <section
      aria-describedby={summaryId}
      className={['ui-card', 'ui-chart', className].filter(Boolean).join(' ')}
    >
      <header className="ui-card__header">
        <h2>{title}</h2>
      </header>
      <p className="sr-only" id={summaryId}>
        {summary}
      </p>
      <div className="ui-card__body">{children}</div>
    </section>
  )
}
