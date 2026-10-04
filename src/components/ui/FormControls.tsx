import { Icon } from './Icon'
import { Button } from './Controls'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
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

interface SearchFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

export function SearchField({ className, label, ...props }: SearchFieldProps) {
  return (
    <label className={['ui-search-field', className].filter(Boolean).join(' ')}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="ui-search-field__icon">
        <Icon name="search" />
      </span>
      <input
        {...props}
        aria-label={props['aria-label'] ?? label}
        type="search"
      />
    </label>
  )
}

interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  ariaLabel: string
  className?: string
  disabled?: boolean
  loading?: boolean
  menuLabel?: string
  onChange(values: string[]): void
  options: readonly MultiSelectOption[]
  selectAllLabel?: string
  compactTriggerLabel?: string
  triggerLabel?: string
  value: readonly string[]
}

export function MultiSelect({
  ariaLabel,
  className,
  disabled = false,
  loading = false,
  menuLabel,
  onChange,
  options,
  selectAllLabel,
  triggerLabel,
  compactTriggerLabel,
  value,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const reference = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const selectedLabels = options
    .filter((option) => value.includes(option.value))
    .map((option) => option.label)
  const unavailable = disabled || loading || options.length === 0
  const allSelected = options.every((option) => value.includes(option.value))

  useEffect(() => {
    function closeOnPointerDown(event: PointerEvent) {
      if (!reference.current?.contains(event.target as Node)) setOpen(false)
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        trigger.current?.focus({ preventScroll: true })
      }
    }
    function closeOnFocusOutside(event: FocusEvent) {
      if (!reference.current?.contains(event.target as Node)) setOpen(false)
    }

    if (!open || unavailable) return
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('focusin', closeOnFocusOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('focusin', closeOnFocusOutside)
    }
  }, [open, unavailable])

  useEffect(() => {
    if (open && !unavailable)
      reference.current?.querySelector<HTMLInputElement>('input')?.focus()
  }, [open, unavailable])

  return (
    <div
      className={['ui-multi-select', className].filter(Boolean).join(' ')}
      ref={reference}
    >
      <button
        aria-controls={open && !unavailable ? contentId : undefined}
        aria-expanded={open && !unavailable}
        aria-busy={loading || undefined}
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        aria-description={triggerLabel}
        className="ui-multi-select__trigger"
        disabled={unavailable}
        onClick={() => setOpen((current) => !current)}
        ref={trigger}
        type="button"
      >
        <span>
          <span
            className={
              compactTriggerLabel === undefined
                ? undefined
                : 'ui-selection-summary--full'
            }
          >
            {triggerLabel ?? (selectedLabels.join(', ') || ariaLabel)}
          </span>
          {compactTriggerLabel === undefined ? null : (
            <span className="ui-selection-summary--compact">
              {compactTriggerLabel}
            </span>
          )}
        </span>
        <span aria-hidden="true" className="ui-multi-select__indicator">
          <Icon name="down" />
        </span>
      </button>
      {open && !unavailable ? (
        <div
          aria-label={ariaLabel}
          className="ui-multi-select__menu"
          id={contentId}
          role="dialog"
          onMouseDown={(event) => {
            // Label text must activate its checkbox before focus can leave the picker.
            if (!(event.target as Element).closest('input, button'))
              event.preventDefault()
          }}
        >
          {menuLabel === undefined ? null : (
            <strong className="ui-multi-select__title">{menuLabel}</strong>
          )}
          {options.map((option) => {
            const selected = value.includes(option.value)
            return (
              <label
                className="ui-multi-select__option"
                data-selected={selected}
                key={option.value}
              >
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
          {selectAllLabel === undefined ? null : (
            <Button
              className="ui-multi-select__select-all"
              disabled={allSelected}
              onClick={() => {
                onChange(options.map((option) => option.value))
                reference.current
                  ?.querySelector<HTMLInputElement>('input')
                  ?.focus()
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {selectAllLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  )
}
