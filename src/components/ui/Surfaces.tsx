import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

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
}: {
  description: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const reference = useRef<HTMLSpanElement>(null)
  const descriptionId = useId()

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!reference.current?.contains(event.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () =>
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [open])

  return (
    <span className="ui-info-tooltip" ref={reference}>
      <button
        aria-describedby={open ? descriptionId : undefined}
        aria-expanded={open}
        aria-label={label}
        className="ui-info-tooltip__trigger"
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((value) => !value)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        type="button"
      >
        i
      </button>
      {open ? (
        <span
          className="ui-info-tooltip__content"
          id={descriptionId}
          onMouseLeave={() => setOpen(false)}
          role="tooltip"
        >
          {description}
        </span>
      ) : null}
    </span>
  )
}

interface KpiCardProps {
  accent?: Accent
  context?: ReactNode
  label: string
  description?: string
  value: ReactNode
}

export function KpiCard({
  accent = 'cyan',
  context,
  description,
  label,
  value,
}: KpiCardProps) {
  return (
    <section className={`ui-kpi ui-kpi--${accent}`}>
      <h2>
        {label}
        {description === undefined ? null : (
          <InfoTooltip description={description} label={label} />
        )}
      </h2>
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
