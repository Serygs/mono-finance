import { useId, type ReactNode } from 'react'

type Accent = 'cyan' | 'blue' | 'green' | 'violet' | 'pink'

interface CardProps {
  actions?: ReactNode
  children: ReactNode
  className?: string
  title?: string
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

interface KpiCardProps {
  accent?: Accent
  context?: ReactNode
  label: string
  value: ReactNode
}

export function KpiCard({
  accent = 'cyan',
  context,
  label,
  value,
}: KpiCardProps) {
  return (
    <section className={`ui-kpi ui-kpi--${accent}`}>
      <h2>{label}</h2>
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
