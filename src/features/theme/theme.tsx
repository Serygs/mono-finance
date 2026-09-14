/* eslint-disable react-refresh/only-export-components -- provider, hook, and theme constants form one public appearance wrapper. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]
type ResolvedTheme = Exclude<ThemeMode, 'system'>

interface ThemeContextValue {
  mode: ThemeMode
  resolvedTheme: ResolvedTheme
  setMode(mode: ThemeMode): void
}

const STORAGE_KEY = 'mono-finance-theme-v1'
const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  resolvedTheme: 'light',
  setMode: () => undefined,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(readInitialMode)
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(readSystemTheme)
  const resolvedTheme = mode === 'system' ? systemTheme : mode

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const updateSystemTheme = () =>
      setSystemTheme(media.matches ? 'dark' : 'light')
    updateSystemTheme()
    media.addEventListener('change', updateSystemTheme)
    return () => media.removeEventListener('change', updateSystemTheme)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset['theme'] = resolvedTheme
    root.style.colorScheme = resolvedTheme
    document
      .querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
      ?.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#151a24' : '#eef2f8',
      )
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Keep the selected appearance for the current session.
    }
  }, [mode, resolvedTheme])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

function readInitialMode(): ThemeMode {
  try {
    const mode = window.localStorage.getItem(STORAGE_KEY)
    return THEME_MODES.includes(mode as ThemeMode)
      ? (mode as ThemeMode)
      : 'system'
  } catch {
    return 'system'
  }
}

function readSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}
