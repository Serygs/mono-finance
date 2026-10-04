const STORAGE_KEY = 'mono-finance-locale-v1'
let rememberedLocale: string | null = null

export function readStoredLocale(): string | null {
  if (rememberedLocale !== null) return rememberedLocale
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export function persistLocale(locale: string): void {
  rememberedLocale = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // React state and rememberedLocale retain the choice when storage is unavailable.
  }
}
