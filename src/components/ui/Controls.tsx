import type { ReactNode } from 'react'
import type { HTMLMotionProps } from 'motion/react'
import * as m from 'motion/react-m'
import { motionTiming, useReducedAnimation } from './motion'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
type ButtonSize = 'small' | 'medium' | 'large'

interface ButtonProps extends HTMLMotionProps<'button'> {
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
    <PressButton
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
    </PressButton>
  )
}

interface IconButtonProps extends Omit<
  HTMLMotionProps<'button'>,
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
    <PressButton
      {...props}
      aria-label={label}
      className={classes('ui-icon-button', className)}
      title={label}
      type={props.type ?? 'button'}
    >
      <span aria-hidden="true">{children}</span>
    </PressButton>
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
          <PressButton
            aria-pressed={option.value === value}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="ui-segmented-control__label">{option.label}</span>
          </PressButton>
        ))}
      </div>
    </fieldset>
  )
}

function PressButton({ disabled, ...props }: HTMLMotionProps<'button'>) {
  const reduced = useReducedAnimation()
  return (
    <m.button
      {...props}
      disabled={disabled}
      animate={{ scale: 1 }}
      whileTap={{ scale: disabled || reduced ? 1 : 0.98 }}
      transition={{
        duration: reduced ? 0 : motionTiming.feedback,
        ease: motionTiming.ease,
      }}
    />
  )
}

function classes(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ')
}
