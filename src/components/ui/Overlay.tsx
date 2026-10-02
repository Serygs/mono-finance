import { useId, type ReactNode } from 'react'
import { useModalDialog } from './use-modal-dialog'

import { useLocalization } from '../../features/localization/localization'
import { IconButton } from './Controls'

interface OverlayProps {
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
  children,
  kind,
  onClose,
  open,
  title,
}: OverlayProps & { kind: 'dialog' | 'sheet' }) {
  const { t } = useLocalization()
  const { dialogRef, onCancel, onBackdropClick } = useModalDialog(open, onClose)
  const titleId = useId()

  if (!open) return null

  return (
    <dialog
      aria-labelledby={titleId}
      aria-modal="true"
      className={`ui-overlay ui-overlay--${kind}`}
      onCancel={onCancel}
      onClick={onBackdropClick}
      ref={dialogRef}
    >
      <div className="ui-overlay__surface">
        <header className="ui-overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label={t('Close')} onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="ui-overlay__content">{children}</div>
      </div>
    </dialog>
  )
}
