import { useEffect, useId, useRef, type ReactNode } from 'react'

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
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || dialog === null) return
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      aria-labelledby={titleId}
      aria-modal="true"
      className={`ui-overlay ui-overlay--${kind}`}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      ref={dialogRef}
    >
      <div className="ui-overlay__surface">
        <header className="ui-overlay__header">
          <h2 id={titleId}>{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="ui-overlay__content">{children}</div>
      </div>
    </dialog>
  )
}
