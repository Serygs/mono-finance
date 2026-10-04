import { domAnimation, LazyMotion, MotionConfig } from 'motion/react'
import { useSyncExternalStore, type ReactNode } from 'react'
import { ReducedMotionContext } from './motion'

const query = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(query)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

export function MotionProvider({ children }: { children: ReactNode }) {
  // Motion 14's useReducedMotion snapshots the preference at mount. Subscribe
  // here so an OS preference change also stops motion in already-open controls.
  const reduced = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => true,
  )
  return (
    <ReducedMotionContext value={reduced}>
      {/* MotionConfig also snapshots reduction at mount. The shared primitives
          apply our live policy to targets and durations, including active exits. */}
      <MotionConfig reducedMotion="never">
        {/* Keep first interaction/offline use synchronous; omit drag/layout features. */}
        <LazyMotion features={domAnimation} strict>
          {children}
        </LazyMotion>
      </MotionConfig>
    </ReducedMotionContext>
  )
}
