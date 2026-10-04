import type { ReactNode } from 'react'
import { useUpdateBlocker } from './use-update-blocker'

/** For editors whose draft lifetime is the lifetime of a popover's content. */
export function UpdateProtectedEditor({
  children,
  className,
}: {
  children: ReactNode
  className: string
}) {
  useUpdateBlocker(true)
  return <div className={className}>{children}</div>
}
