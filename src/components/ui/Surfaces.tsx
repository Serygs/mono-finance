import { useId, type ReactNode } from 'react'
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
}

export function KpiCard({
  accent = 'cyan',
  context,
  description,
  icon,
  label,
  value,
}: KpiCardProps) {
  return (
    <section className={`ui-kpi ui-kpi--${accent}`}>
      <header className="ui-kpi__header">
        <h2>
          {description === undefined ? (
            label
          ) : (
            <InfoTooltip description={description} label={label}>
              {label}
              <Icon name="info" />
            </InfoTooltip>
          )}
        </h2>
        {icon === undefined ? null : (
          <span aria-hidden="true" className="ui-kpi__icon">
            {icon}
          </span>
        )}
      </header>
      <div className="ui-kpi__value">{value}</div>
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
