import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface PopoverProps {
  children: ReactNode
  className?: string
  content: ReactNode
  label: string
}

export function Popover({ children, className, content, label }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const contentId = useId()
  const reference = useRef<HTMLSpanElement>(null)
  const overlay = useRef<HTMLDivElement>(null)

  function close() {
    setOpen(false)
    setPosition(null)
  }

  useEffect(() => {
    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (
        !reference.current?.contains(target) &&
        !overlay.current?.contains(target)
      ) {
        close()
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
    }

    if (!open) return
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function updatePosition() {
      const trigger = reference.current?.querySelector('button')
      const content = overlay.current
      if (trigger === null || trigger === undefined || content === null) return

      const triggerRect = trigger.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      const viewportPadding = 12
      const offset = 8
      const spaceBelow = window.innerHeight - triggerRect.bottom
      const spaceAbove = triggerRect.top
      const placement =
        spaceBelow >= contentRect.height + viewportPadding ||
        spaceBelow >= spaceAbove
          ? 'bottom'
          : 'top'
      const maxLeft = Math.max(
        viewportPadding,
        window.innerWidth - contentRect.width - viewportPadding,
      )
      const maxTop = Math.max(
        viewportPadding,
        window.innerHeight - contentRect.height - viewportPadding,
      )
      const left = Math.min(
        Math.max(viewportPadding, triggerRect.right - contentRect.width),
        maxLeft,
      )
      const top =
        placement === 'bottom'
          ? Math.min(
              maxTop,
              Math.max(viewportPadding, triggerRect.bottom + offset),
            )
          : Math.min(
              maxTop,
              Math.max(
                viewportPadding,
                triggerRect.top - contentRect.height - offset,
              ),
            )

      setPosition({ left, placement, top })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    const resizeObserver = new ResizeObserver(updatePosition)
    const trigger = reference.current?.querySelector('button')
    if (trigger !== null && trigger !== undefined)
      resizeObserver.observe(trigger)
    if (overlay.current !== null) resizeObserver.observe(overlay.current)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      resizeObserver.disconnect()
    }
  }, [open])

  const overlayContent = !open ? null : (
    <div
      aria-label={label}
      className={[
        'ui-popover__content',
        'ui-popover__content--portal',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      data-placement={position?.placement}
      id={contentId}
      ref={overlay}
      role="dialog"
      style={
        position === null
          ? { visibility: 'hidden' }
          : { left: position.left, top: position.top }
      }
    >
      {content}
    </div>
  )

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
        onClick={() => {
          setPosition(null)
          setOpen((value) => !value)
        }}
        type="button"
      >
        {children}
      </button>
      {overlayContent === null || typeof document === 'undefined'
        ? null
        : createPortal(overlayContent, document.body)}
    </span>
  )
}

interface PopoverPosition {
  left: number
  placement: 'bottom' | 'top'
  top: number
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
