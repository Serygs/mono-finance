import { createContext, useContext, useLayoutEffect } from 'react'
import {
  useAnimationControls,
  usePresence,
  type MotionProps,
} from 'motion/react'

// Match --motion-fast/--motion-standard and the existing easing in index.css.
export const motionTiming = {
  feedback: 0.14,
  enter: 0.2,
  exit: 0.14,
  ease: [0.2, 0.8, 0.2, 1],
} as const

export const ReducedMotionContext = createContext(true)

export function useReducedAnimation() {
  return useContext(ReducedMotionContext)
}

export function usePresenceMotion(
  kind: 'popover' | 'dialog' | 'sheet',
): MotionProps {
  const reduced = useReducedAnimation()
  const [present, safeToRemove] = usePresence()
  const controls = useAnimationControls()
  const offset = kind === 'sheet' ? 12 : 4

  useLayoutEffect(() => {
    let current = true
    // Declarative exit animations ignore later prop changes in Motion 14.
    // Explicit controls let a live preference change cancel entry or exit.
    if (reduced) {
      controls.set({ opacity: present ? 1 : 0, y: 0 })
      if (!present) safeToRemove?.()
    } else {
      void controls
        .start({
          opacity: present ? 1 : 0,
          y: present ? 0 : offset,
          transition: {
            duration: present ? motionTiming.enter : motionTiming.exit,
            ease: motionTiming.ease,
          },
        })
        .then(() => {
          if (current && !present) safeToRemove?.()
        })
    }
    return () => {
      current = false
      controls.stop()
    }
  }, [controls, offset, present, reduced, safeToRemove])

  return {
    initial: reduced ? false : { opacity: 0, y: offset },
    animate: controls,
  }
}
