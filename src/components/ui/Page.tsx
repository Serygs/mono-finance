import type { ReactNode } from 'react'

interface PageSurfaceProps {
  children: ReactNode
  className?: string
}

export function PageSurface({ children, className }: PageSurfaceProps) {
  return (
    <section className={['ui-page', className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}

interface PageHeaderProps {
  actions?: ReactNode
  description?: ReactNode
  eyebrow?: string
  id?: string
  title: string
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  id,
  title,
}: PageHeaderProps) {
  return (
    <header className="ui-page-header">
      <div className="ui-page-header__identity">
        {eyebrow === undefined ? null : <p className="ui-eyebrow">{eyebrow}</p>}
        <h1 id={id}>{title}</h1>
        {description === undefined ? null : (
          <div className="ui-page-description">{description}</div>
        )}
      </div>
      {actions === undefined ? null : (
        <div className="ui-page-header__actions">{actions}</div>
      )}
    </header>
  )
}
