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
    // The visual viewport shrinks when the software keyboard is open on iOS.
    const viewport = window.visualViewport
    function updateViewport() {
      dialog?.style.setProperty(
        '--overlay-viewport-height',
        `${viewport?.height ?? window.innerHeight}px`,
      )
      dialog?.style.setProperty(
        '--overlay-viewport-top',
        `${viewport?.offsetTop ?? 0}px`,
      )
    }
    updateViewport()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
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
