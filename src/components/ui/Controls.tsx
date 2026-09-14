import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  size?: ButtonSize
  variant?: ButtonVariant
}

export function Button({
  children,
  className,
  disabled,
  loading = false,
  size = 'medium',
  variant = 'primary',
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={classes(
        'ui-button',
        `ui-button--${variant}`,
        `ui-button--${size}`,
        className,
      )}
      disabled={disabled || loading}
    >
      {children}
    </button>
  )
}

interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label'
> {
  label: string
  children: ReactNode
}

export function IconButton({
  children,
  className,
  label,
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={classes('ui-icon-button', className)}
      title={label}
      type={props.type ?? 'button'}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

interface SegmentedOption<T extends string> {
  label: string
  value: T
}

interface SegmentedControlProps<T extends string> {
  label: string
  onChange(value: T): void
  options: readonly SegmentedOption<T>[]
  value: T
}

export function SegmentedControl<T extends string>({
  label,
  onChange,
  options,
  value,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="ui-segmented-control">
      <legend className="ui-field-label">{label}</legend>
      <div className="ui-segmented-control__track">
        {options.map((option) => (
          <button
            aria-pressed={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="ui-segmented-control__label">{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function classes(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}
