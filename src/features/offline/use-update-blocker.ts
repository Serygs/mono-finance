import { useLayoutEffect } from 'react'
import { serviceWorkerUpdates } from './service-worker-updates'

/** Conservatively protect the entire editing session, including failed saves. */
export function useUpdateBlocker(editing: boolean): void {
  useLayoutEffect(() => {
    if (editing) return serviceWorkerUpdates.blockForEditor()
  }, [editing])
}
