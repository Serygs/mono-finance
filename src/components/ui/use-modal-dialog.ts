import { useEffect, useRef, type MouseEvent, type SyntheticEvent } from 'react'

// One native-modal lifecycle for shared sheets/dialogs and feature-owned chrome.
export function useModalDialog(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || dialog === null) return
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    if (!dialog.open) dialog.showModal()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      if (dialog.open) dialog.close()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [open])

  return {
    dialogRef,
    onCancel(event: SyntheticEvent<HTMLDialogElement>) {
      event.preventDefault()
      onClose()
    },
    onBackdropClick(event: MouseEvent<HTMLDialogElement>) {
      if (event.target === event.currentTarget) onClose()
    },
  }
}
