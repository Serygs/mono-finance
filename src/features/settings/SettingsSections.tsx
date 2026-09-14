import { useId, type ReactNode } from 'react'

interface SettingsGroupProps {
  children: ReactNode
  title: string
}

export function SettingsGroup({ children, title }: SettingsGroupProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="settings-group">
      <h2 id={titleId}>{title}</h2>
      <div className="settings-group__rows">{children}</div>
    </section>
  )
}

interface SettingsRowContentProps {
  icon: string
  subtitle?: string
  title: string
  trailing?: ReactNode
}

export function SettingsRowContent({
  icon,
  subtitle,
  title,
  trailing,
}: SettingsRowContentProps) {
  return (
    <>
      <span aria-hidden="true" className="settings-row__icon">
        {icon}
      </span>
      <span className="settings-row__copy">
        <strong>{title}</strong>
        {subtitle === undefined ? null : <small>{subtitle}</small>}
      </span>
      {trailing === undefined ? null : (
        <span className="settings-row__trailing">{trailing}</span>
      )}
    </>
  )
}

interface SettingsRowProps extends SettingsRowContentProps {
  className?: string
}

export function SettingsRow({ className, ...props }: SettingsRowProps) {
  return (
    <div className={['settings-row', className].filter(Boolean).join(' ')}>
      <SettingsRowContent {...props} />
    </div>
  )
}
