import type { SVGProps } from 'react'

const paths = {
  overview: 'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9',
  transactions: 'M4 7h16M4 12h16M4 17h10',
  categories: 'M12 3v9h9M9 3.5a9 9 0 1 0 11.5 11.5',
  accounts: 'M3 6h18v14H3zM3 10h18M15 15h3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  filters: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  sync: 'M20 7a8 8 0 0 0-14-2L3 8m0-5v5h5M4 17a8 8 0 0 0 14 2l3-3m0 5v-5h-5',
  close: 'm6 6 12 12M18 6 6 18',
  info: 'M12 16v-4M12 8h.01',
  chevron: 'm9 5 7 7-7 7',
  down: 'm6 9 6 6 6-6',
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  grip: 'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',
  check: 'm5 12 4 4L19 6',
  add: 'M12 5v14M5 12h14',
  theme: 'M12 3v18M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18',
  language:
    'M3 12h18M12 3a16 16 0 0 0 0 18 16 16 0 0 0 0-18M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18',
  currency:
    'M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18M12 6v12M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8',
  logout: 'M9 4H4v16h5M9 12h12m-4-4 4 4-4 4',
} satisfies Record<string, string>

export type IconName = keyof typeof paths

export function Icon({
  name,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {name === 'info' ? <circle cx="12" cy="12" r="9" /> : null}
      <path d={paths[name]} />
    </svg>
  )
}
