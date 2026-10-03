import { describe, expect, it } from 'vitest'
import {
  transactionSyncLabel,
  transactionSyncTone,
} from './transaction-sync-presentation'
import type { TransactionSyncState } from './transaction-sync-types'
import type { Translate } from '../localization/localization'

const state: TransactionSyncState = {
  accountId: 'synthetic',
  accountType: 'black',
  currencyCode: 'UAH',
  lastErrorCode: null,
  lastSuccessfulSyncAt: 1735689600,
  status: 'idle',
}
const t: Translate = (key, values) =>
  key.replace('{date}', String(values?.['date'] ?? ''))

describe('transaction sync presentation', () => {
  it('prioritizes running/failed state over a previous successful timestamp', () => {
    expect(transactionSyncLabel({ ...state, status: 'running' }, t, 'en')).toBe(
      'Sync in progress',
    )
    expect(transactionSyncTone({ ...state, status: 'running' })).toBe('neutral')
    expect(transactionSyncLabel({ ...state, status: 'failed' }, t, 'en')).toBe(
      'Sync needs retry',
    )
    expect(transactionSyncTone({ ...state, status: 'failed' })).toBe('danger')
  })
  it('only shows a successful date supplied by the API, with localized dates', () => {
    expect(
      transactionSyncLabel({ ...state, lastSuccessfulSyncAt: null }, t, 'en'),
    ).toBe('Not synced yet')
    const english = transactionSyncLabel(state, t, 'en')
    const ukrainian = transactionSyncLabel(state, t, 'uk')
    expect(english).toContain('Transaction sync succeeded')
    expect(english).toContain('2025')
    expect(ukrainian).toContain('2025')
    expect(ukrainian).not.toBe(english)
    expect(transactionSyncTone(state)).toBe('success')
  })
})
