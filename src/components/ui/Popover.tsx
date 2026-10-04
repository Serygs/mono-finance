import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'motion/react'
import { MotionPopover } from './MotionPopover'
import { BottomSheet } from './Overlay'
import { Icon } from './Icon'

const HOVER_CLOSE_DELAY_MILLISECONDS = 150

interface PopoverProps {
  children: ReactNode
  className?: string
  content: ReactNode
  label: string
  description?: string
  openOnFocusHover?: boolean
  mobileSheet?: boolean
  disabled?: boolean
}

export function Popover({
  children,
  className,
  content,
  label,
  description,
  openOnFocusHover = false,
  mobileSheet = false,
  disabled = false,
}: PopoverProps) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<PopoverPosition | null>(null)
  const [mobile, setMobile] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches,
  )
  const pinned = useRef(false)
  const pointerFocus = useRef(false)
  const hovered = useRef(false)
  const keyboardFocused = useRef(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current)
    },
    [],
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const update = () => setMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const contentId = useId()
  const reference = useRef<HTMLSpanElement>(null)
  const overlay = useRef<HTMLDivElement>(null)

  const cancelScheduledClose = useCallback(() => {
    if (closeTimer.current === null) return
    clearTimeout(closeTimer.current)
    closeTimer.current = null
  }, [])

  const close = useCallback(() => {
    cancelScheduledClose()
    pinned.current = false
    setOpen(false)
    setPosition(null)
  }, [cancelScheduledClose])

  function scheduleTransientClose() {
    if (!openOnFocusHover) return
    cancelScheduledClose()
    // Allow the pointer to cross the gap between the trigger and its portal.
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      if (
        !pinned.current &&
        !hovered.current &&
        !keyboardFocused.current &&
        !overlay.current?.contains(document.activeElement)
      )
        close()
    }, HOVER_CLOSE_DELAY_MILLISECONDS)
  }

  function enterHover() {
    hovered.current = true
    cancelScheduledClose()
  }

  function leaveHover() {
    hovered.current = false
    scheduleTransientClose()
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
      if (event.key === 'Escape') {
        event.stopPropagation()
        close()
        pointerFocus.current =
          document.activeElement !== reference.current?.querySelector('button')
        reference.current
          ?.querySelector('button')
          ?.focus({ preventScroll: true })
      }
    }

    function closeOnFocusOutside(event: FocusEvent) {
      const target = event.target as Node
      if (
        !reference.current?.contains(target) &&
        !overlay.current?.contains(target)
      )
        close()
    }

    if (!open || (mobileSheet && mobile)) return
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    document.addEventListener('focusin', closeOnFocusOutside)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
      document.removeEventListener('focusin', closeOnFocusOutside)
    }
  }, [open, close, mobileSheet, mobile])

  const positioned = position !== null
  useEffect(() => {
    if (!open || !positioned || openOnFocusHover || (mobileSheet && mobile))
      return
    overlay.current
      ?.querySelector<HTMLElement>(
        'button, select, input, a[href], [tabindex="0"]',
      )
      ?.focus({ preventScroll: true })
  }, [open, positioned, openOnFocusHover, mobileSheet, mobile])

  useEffect(() => {
    if (!open || (mobileSheet && mobile)) return

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
  }, [open, mobileSheet, mobile])

  const overlayContent = !open ? null : (
    <MotionPopover
      key="popover"
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
      onPointerEnter={(event) => {
        if (openOnFocusHover && event.pointerType === 'mouse') enterHover()
      }}
      onPointerLeave={(event) => {
        if (openOnFocusHover && event.pointerType === 'mouse') leaveHover()
      }}
      onBlur={scheduleTransientClose}
      onClick={(event) => {
        if (
          (event.target as Element).closest('[data-popover-dismiss]') !== null
        ) {
          close()
          pointerFocus.current = true
          reference.current
            ?.querySelector('button')
            ?.focus({ preventScroll: true })
        }
      }}
      style={
        position === null
          ? { visibility: 'hidden' }
          : { left: position.left, top: position.top }
      }
    >
      {content}
    </MotionPopover>
  )

  return (
    <span
      className={['ui-popover', className].filter(Boolean).join(' ')}
      ref={reference}
    >
      <button
        aria-controls={open && !(mobileSheet && mobile) ? contentId : undefined}
        aria-describedby={open && openOnFocusHover ? contentId : undefined}
        aria-expanded={open}
        aria-disabled={disabled || undefined}
        aria-haspopup="dialog"
        aria-label={label}
        aria-description={description}
        className="ui-popover__trigger"
        onPointerDown={() => {
          pointerFocus.current = true
        }}
        onFocus={() => {
          if (!disabled && openOnFocusHover && !pointerFocus.current) {
            keyboardFocused.current = true
            cancelScheduledClose()
            setOpen(true)
          }
          pointerFocus.current = false
        }}
        onBlur={() => {
          keyboardFocused.current = false
          scheduleTransientClose()
        }}
        onPointerEnter={(event) => {
          if (!disabled && openOnFocusHover && event.pointerType === 'mouse') {
            enterHover()
            setOpen(true)
          }
        }}
        onPointerLeave={(event) => {
          if (openOnFocusHover && event.pointerType === 'mouse') leaveHover()
        }}
        onClick={() => {
          if (disabled) return
          cancelScheduledClose()
          pointerFocus.current = false
          setPosition(null)
          if (openOnFocusHover && !pinned.current) {
            pinned.current = true
            setOpen(true)
          } else if (open) close()
          else setOpen(true)
        }}
        type="button"
      >
        {children}
      </button>
      {mobileSheet && mobile ? (
        <BottomSheet open={open} onClose={close} title={label}>
          <div
            onClick={(event) => {
              if (
                (event.target as Element).closest('[data-popover-dismiss]') !==
                null
              )
                close()
            }}
          >
            {content}
          </div>
        </BottomSheet>
      ) : typeof document === 'undefined' ? null : (
        createPortal(
          <AnimatePresence>{overlayContent}</AnimatePresence>,
          document.body,
        )
      )}
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
        <Icon name="more" />
      </span>
      <span className="sr-only">{children}</span>
    </Popover>
  )
}
