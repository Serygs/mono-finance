import type { ButtonHTMLAttributes, ReactNode } from 'react'

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger'

interface StatusBadgeProps {
  label: string
  tone?: StatusTone
}

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`ui-status-badge ui-status-badge--${tone}`}>{label}</span>
  )
}

interface AccountChipProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'children'
> {
  detail?: ReactNode
  label: string
  selected: boolean
}

export function AccountChip({
  className,
  detail,
  label,
  selected,
  ...props
}: AccountChipProps) {
  return (
    <button
      {...props}
      aria-pressed={selected}
      className={['ui-chip', 'ui-account-chip', className]
        .filter(Boolean)
        .join(' ')}
      type={props.type ?? 'button'}
    >
      <span>{label}</span>
      {detail === undefined ? null : <small>{detail}</small>}
    </button>
  )
}

interface CategoryChipProps {
  color?: string | null
  icon?: ReactNode
  label: string
}

export function CategoryChip({ color, icon, label }: CategoryChipProps) {
  return (
    <span
      className={[
        'ui-chip',
        'ui-category-chip',
        color ? `ui-chip--${color}` : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span aria-hidden="true" className="ui-category-chip__dot" />
      {icon === undefined ? null : (
        <span aria-hidden="true" className="ui-category-chip__icon">
          {icon}
        </span>
      )}
      {label}
    </span>
  )
}
