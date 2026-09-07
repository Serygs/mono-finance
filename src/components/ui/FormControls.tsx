import type { ReactNode, SelectHTMLAttributes } from 'react'

interface FormFieldProps {
  children: ReactNode
  className?: string
  error?: string
  hint?: string
  label: string
}

export function FormField({
  children,
  className,
  error,
  hint,
  label,
}: FormFieldProps) {
  return (
    <label className={['ui-field', className].filter(Boolean).join(' ')}>
      <span className="ui-field-label">{label}</span>
      {children}
      {hint === undefined ? null : (
        <span className="ui-field-hint">{hint}</span>
      )}
      {error === undefined ? null : (
        <span className="ui-field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  )
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={['ui-select', className].filter(Boolean).join(' ')}
    >
      {children}
    </select>
  )
}
