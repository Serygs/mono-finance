import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('locale storage fallback', () => {
  it('retains language changes in memory when storage writes throw', async () => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: () => 'en',
        setItem: () => {
          throw new DOMException('Quota exceeded', 'QuotaExceededError')
        },
      },
    })
    const { persistLocale, readStoredLocale } = await import('./locale-storage')
    expect(() => persistLocale('uk')).not.toThrow()
    expect(readStoredLocale()).toBe('uk')
  })

  it('works when obtaining localStorage itself throws', async () => {
    vi.stubGlobal('window', {
      get localStorage() {
        throw new DOMException('Unavailable', 'SecurityError')
      },
    })
    const { persistLocale, readStoredLocale } = await import('./locale-storage')
    expect(readStoredLocale()).toBeNull()
    persistLocale('en')
    expect(readStoredLocale()).toBe('en')
  })
})
