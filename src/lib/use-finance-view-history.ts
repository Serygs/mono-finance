import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/** History-entry state, never local financial storage or an authoritative cache. */
export function useFinanceViewHistory<T>(view: T, ready = false) {
  useEffect(() => {
    function save() {
      const current = window.history.state
      window.history.replaceState(
        {
          ...current,
          usr: {
            ...current?.usr,
            financeView: view,
            financeScrollY: window.scrollY,
          },
        },
        '',
      )
    }
    save()
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [view])
  useRestoreFinanceScroll(ready)
}

export function useRestoreFinanceScroll(ready: boolean) {
  const location = useLocation()
  const restore = useRef<number | null>(location.state?.financeScrollY ?? null)
  useEffect(() => {
    if (!ready || restore.current === null) return
    const y = restore.current
    const frame = requestAnimationFrame(() => {
      restore.current = null
      window.scrollTo({ top: y })
    })
    return () => cancelAnimationFrame(frame)
  }, [ready])
}
