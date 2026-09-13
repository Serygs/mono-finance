import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'

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

interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  ariaLabel: string
  className?: string
  onChange(values: string[]): void
  options: readonly MultiSelectOption[]
  value: readonly string[]
}

export function MultiSelect({
  ariaLabel,
  className,
  onChange,
  options,
  value,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const reference = useRef<HTMLDivElement>(null)
  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label)

  useEffect(() => {
    function closeOnPointerDown(event: PointerEvent) {
      if (!reference.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    if (!open) return
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  return (
    <div
      className={['ui-multi-select', className].filter(Boolean).join(' ')}
      ref={reference}
    >
      <button
        aria-controls={open ? contentId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className="ui-multi-select__trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{selectedLabels.join(', ') || ariaLabel}</span>
        <span aria-hidden="true" className="ui-multi-select__indicator">
          ⌄
        </span>
      </button>
      {open ? (
        <div
          aria-label={ariaLabel}
          className="ui-multi-select__menu"
          id={contentId}
          role="dialog"
        >
          {options.map((option) => {
            const selected = value.includes(option.value)
            return (
              <label className="ui-multi-select__option" key={option.value}>
                <input
                  checked={selected}
                  onChange={() =>
                    onChange(
                      selected
                        ? value.filter((item) => item !== option.value)
                        : [...value, option.value],
                    )
                  }
                  type="checkbox"
                />
                <span>{option.label}</span>
              </label>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
