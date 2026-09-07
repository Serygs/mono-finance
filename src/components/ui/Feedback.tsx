import type { ReactNode } from 'react'

type AlertTone = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps {
  children: ReactNode
  className?: string
  title?: string
  tone?: AlertTone
}

export function Alert({
  children,
  className,
  title,
  tone = 'info',
}: AlertProps) {
  return (
    <section
      aria-live={tone === 'danger' ? 'assertive' : 'polite'}
      className={['ui-alert', `ui-alert--${tone}`, className]
        .filter(Boolean)
        .join(' ')}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      {title === undefined ? null : <strong>{title}</strong>}
      <div>{children}</div>
    </section>
  )
}

interface EmptyStateProps {
  action?: ReactNode
  children: ReactNode
  title: string
}

export function EmptyState({ action, children, title }: EmptyStateProps) {
  return (
    <section className="ui-empty-state">
      <div className="ui-empty-state__mark" aria-hidden="true" />
      <h2>{title}</h2>
      <div>{children}</div>
      {action === undefined ? null : (
        <div className="ui-empty-state__action">{action}</div>
      )}
    </section>
  )
}

interface SkeletonProps {
  label: string
  lines?: number
}

export function Skeleton({ label, lines = 1 }: SkeletonProps) {
  return (
    <div className="ui-skeleton" role="status">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <span aria-hidden="true" key={index} />
      ))}
    </div>
  )
}
