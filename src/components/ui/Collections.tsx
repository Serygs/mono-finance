import type { ReactNode } from 'react'

interface CompactListProps {
  children: ReactNode
  className?: string
  label?: string
}

export function CompactList({ children, className, label }: CompactListProps) {
  return (
    <ul
      aria-label={label}
      className={['ui-compact-list', className].filter(Boolean).join(' ')}
    >
      {children}
    </ul>
  )
}

interface CompactTableProps {
  children: ReactNode
  className?: string
}

export function CompactTable({ children, className }: CompactTableProps) {
  return (
    <div className={['ui-compact-table', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
