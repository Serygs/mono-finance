import type { SVGProps } from 'react'

const ICON_PATHS: Readonly<Record<string, readonly string[]>> = {
  bills: ['M6 2h12v20l-3-2-3 2-3-2-3 2V2Z', 'M9 7h6M9 11h6M9 15h4'],
  dining: ['M7 3v7M4 3v4a3 3 0 0 0 6 0V3M7 10v11', 'M16 3v18M16 3c3 2 4 6 0 9'],
  education: ['m3 10 9-5 9 5-9 5-9-5Z', 'M7 12v5c3 2 7 2 10 0v-5M21 10v6'],
  entertainment: [
    'M7 8h10a5 5 0 0 1 4.5 7.2l-1.2 2.4a2.5 2.5 0 0 1-4.2.4L14 16h-4l-2.1 2a2.5 2.5 0 0 1-4.2-.4l-1.2-2.4A5 5 0 0 1 7 8Z',
    'M7 12v4M5 14h4M16 13h.01M19 15h.01',
  ],
  groceries: ['M3 4h2l2 11h10l3-8H6', 'M9 20h.01M17 20h.01'],
  health: [
    'M12 21s-7-4.4-7-11a4 4 0 0 1 7-2.7A4 4 0 0 1 19 10c0 6.6-7 11-7 11Z',
    'M9 13h6M12 10v6',
  ],
  home: ['m3 11 9-8 9 8', 'M5 10v11h14V10M9 21v-7h6v7'],
  savings: [
    'M5 12a7 7 0 0 1 7-7h3a5 5 0 0 1 5 5v7h-3l-1 3H9l-1-3H5v-5Z',
    'M16 8h.01M4 10H2V7',
  ],
  shopping: ['M6 8h12l-1 13H7L6 8Z', 'M9 10V6a3 3 0 0 1 6 0v4'],
  transport: [
    'M5 17h14M6 17l1-8h10l1 8',
    'M8 13h.01M16 13h.01M8 20h.01M16 20h.01',
  ],
  travel: ['M4 19h16M6 19l2-13h8l2 13', 'M9 6V4h6v2M8 11h8'],
  wallet: [
    'M3 6h16a2 2 0 0 1 2 2v11H5a2 2 0 0 1-2-2V6Z',
    'M3 8V5a2 2 0 0 1 2-2h12M16 12h5v4h-5a2 2 0 0 1 0-4Z',
  ],
}

interface CategoryIconProps extends SVGProps<SVGSVGElement> {
  token: string | null
}

export function CategoryIcon({ token, ...props }: CategoryIconProps) {
  const paths = token === null ? undefined : ICON_PATHS[token]
  if (paths === undefined) return null

  return (
    <svg
      {...props}
      aria-hidden="true"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {paths.map((path) => (
        <path
          d={path}
          key={path}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      ))}
    </svg>
  )
}
