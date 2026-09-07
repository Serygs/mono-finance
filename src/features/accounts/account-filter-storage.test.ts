import { describe, expect, it } from 'vitest'

import {
  loadAccountFilter,
  saveAccountFilter,
  toggleAccountFilter,
  type AccountFilter,
} from './account-filter-storage'

describe('account filter storage', () => {
  it('stores only the versioned filter mode and account IDs', () => {
    const storage = new MemoryStorage()
    const filter: AccountFilter = {
      mode: 'selected',
      accountIds: ['account-1', 'account-2'],
    }

    saveAccountFilter(storage, filter)

    expect(storage.keys()).toEqual(['mono-finance:account-filter:v1'])
    expect(loadAccountFilter(storage)).toEqual(filter)
  })

  it('falls back to all accounts for malformed or unavailable storage', () => {
    const malformed = new MemoryStorage()
    malformed.setItem('mono-finance:account-filter:v1', '{broken')

    expect(loadAccountFilter(malformed)).toEqual({ mode: 'all' })
    expect(loadAccountFilter(new ThrowingStorage())).toEqual({ mode: 'all' })
  })

  it('selects one account from all and then supports a multi-account selection', () => {
    const one = toggleAccountFilter({ mode: 'all' }, 'account-1')
    const multiple = toggleAccountFilter(one, 'account-2')

    expect(one).toEqual({ mode: 'selected', accountIds: ['account-1'] })
    expect(multiple).toEqual({
      mode: 'selected',
      accountIds: ['account-1', 'account-2'],
    })
  })

  it('does not allow deselecting the final selected account', () => {
    expect(
      toggleAccountFilter(
        { mode: 'selected', accountIds: ['account-1'] },
        'account-1',
      ),
    ).toEqual({ mode: 'selected', accountIds: ['account-1'] })
  })
})

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null
  }

  keys() {
    return [...this.values.keys()]
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

class ThrowingStorage extends MemoryStorage {
  override getItem(): string | null {
    throw new Error('Storage is unavailable.')
  }
}
