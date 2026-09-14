import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

interface PopoverProps {
  children: ReactNode
  className?: string
  content: ReactNode
  label: string
}

export function Popover({ children, className, content, label }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const contentId = useId()
  const reference = useRef<HTMLSpanElement>(null)

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
    <span
      className={['ui-popover', className].filter(Boolean).join(' ')}
      ref={reference}
    >
      <button
        aria-controls={open ? contentId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className="ui-popover__trigger"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {children}
      </button>
      {open ? (
        <span
          aria-label={label}
          className="ui-popover__content"
          id={contentId}
          role="dialog"
        >
          {content}
        </span>
      ) : null}
    </span>
  )
}

interface OverflowMenuProps {
  children: ReactNode
  className?: string
  content: ReactNode
  label: string
}

export function OverflowMenu({
  children,
  className,
  content,
  label,
}: OverflowMenuProps) {
  return (
    <Popover
      className={['ui-overflow-menu', className].filter(Boolean).join(' ')}
      content={content}
      label={label}
    >
      <span aria-hidden="true" className="ui-overflow-menu__indicator">
        •••
      </span>
      <span className="sr-only">{children}</span>
    </Popover>
  )
}
