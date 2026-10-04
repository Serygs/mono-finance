import { useId, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, useIsPresent } from 'motion/react'
import * as m from 'motion/react-m'
import { useModalDialog } from './use-modal-dialog'
import { usePresenceMotion } from './motion'

import { useLocalization } from '../../features/localization/localization'
import { IconButton } from './Controls'
import { Icon } from './Icon'

interface OverlayProps {
  className?: string
  children: ReactNode
  onClose(): void
  open: boolean
  title: string
}

export function BottomSheet(props: OverlayProps) {
  return <OverlayFrame {...props} kind="sheet" />
}

export function Dialog(props: OverlayProps) {
  return <OverlayFrame {...props} kind="dialog" />
}

function OverlayFrame({
  open,
  ...props
}: OverlayProps & { kind: 'dialog' | 'sheet' }) {
  const content = (
    <AnimatePresence>
      {open ? <PresentOverlay key="overlay" {...props} /> : null}
    </AnimatePresence>
  )
  // The closing visual has left the native top layer. Keep it outside grid,
  // overflow and transformed ancestors for the remainder of its exit.
  return typeof document === 'undefined'
    ? content
    : createPortal(content, document.body)
}

function PresentOverlay({
  children,
  className,
  kind,
  onClose,
  title,
}: Omit<OverlayProps, 'open'> & { kind: 'dialog' | 'sheet' }) {
  const { t } = useLocalization()
  const present = useIsPresent()
  const animation = usePresenceMotion(kind)
  const { dialogRef, onCancel, onBackdropClick } = useModalDialog(
    present,
    onClose,
  )
  const titleId = useId()

  return (
    <dialog
      aria-labelledby={titleId}
      aria-modal={present ? true : undefined}
      aria-hidden={present ? undefined : true}
      inert={!present}
      data-exiting={present ? undefined : ''}
      className={`ui-overlay ui-overlay--${kind}${className ? ` ${className}` : ''}`}
      onCancel={onCancel}
      onClick={onBackdropClick}
      ref={dialogRef}
    >
      <m.div className="ui-overlay__surface" {...animation}>
        <header className="ui-overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label={t('Close')} onClick={onClose}>
            <Icon name="close" />
          </IconButton>
        </header>
        <div className="ui-overlay__content">{children}</div>
      </m.div>
    </dialog>
  )
}
