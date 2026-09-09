/* eslint-disable react-refresh/only-export-components -- provider, hook, and pure locale helpers form one public localization wrapper. */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { UKRAINIAN_MESSAGES } from './messages'

export type Locale = 'en' | 'uk'
type Parameters = Readonly<Record<string, number | string>>

interface LocalizationContextValue {
  locale: Locale
  setLocale(locale: Locale): void
  t(key: string, parameters?: Parameters): string
}

const STORAGE_KEY = 'mono-finance-locale-v1'
const LocalizationContext = createContext<LocalizationContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: (key, parameters) => interpolate(key, parameters),
})

export function LocalizationProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(readInitialLocale)

  useEffect(() => {
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<LocalizationContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, parameters) =>
        interpolate(
          locale === 'uk' ? (UKRAINIAN_MESSAGES[key] ?? key) : key,
          parameters,
        ),
    }),
    [locale],
  )

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  )
}

export function useLocalization(): LocalizationContextValue {
  return useContext(LocalizationContext)
}

export function resolveLocale(
  persisted: string | null,
  browserLanguages: readonly string[],
): Locale {
  if (persisted === 'en' || persisted === 'uk') return persisted
  return browserLanguages.some((language) =>
    language.toLowerCase().startsWith('uk'),
  )
    ? 'uk'
    : 'en'
}

export function interpolate(
  message: string,
  parameters: Parameters = {},
): string {
  return message.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (placeholder, name) =>
    Object.hasOwn(parameters, name) ? String(parameters[name]) : placeholder,
  )
}

function readInitialLocale(): Locale {
  try {
    return resolveLocale(
      window.localStorage.getItem(STORAGE_KEY),
      window.navigator.languages,
    )
  } catch {
    return 'en'
  }
}
