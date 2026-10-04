import { useIsPresent, type HTMLMotionProps } from 'motion/react'
import * as m from 'motion/react-m'
import { usePresenceMotion } from './motion'

export function MotionPopover(props: HTMLMotionProps<'div'>) {
  const present = useIsPresent()
  const animation = usePresenceMotion('popover')
  return (
    <m.div
      {...props}
      {...animation}
      aria-hidden={present ? undefined : true}
      inert={!present}
      data-exiting={present ? undefined : ''}
    />
  )
}
