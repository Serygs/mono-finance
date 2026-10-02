import { describe, expect, it } from 'vitest'

import { nextTransactionSyncWindow } from './transaction-sync-window'

describe('nextTransactionSyncWindow', () => {
  it('creates the first historical window within Monobank limits', () => {
    expect(
      nextTransactionSyncWindow({
        backfillCursorAt: null,
        historicalStartAt: 1_000,
        lastSyncedTransactionAt: null,
        nowEpochSeconds: 3_683_000,
      }),
    ).toEqual({ fromEpochSeconds: 1_001_000, toEpochSeconds: 3_683_000 })
  })

  it('uses an overlapping incremental window once historical import is complete', () => {
    expect(
      nextTransactionSyncWindow({
        backfillCursorAt: 1_000,
        historicalStartAt: 1_000,
        lastSyncedTransactionAt: 3_000_000,
        nowEpochSeconds: 3_100_000,
      }),
    ).toEqual({ fromEpochSeconds: 2_913_600, toEpochSeconds: 3_100_000 })
  })

  it('does not create an empty incremental window', () => {
    expect(
      nextTransactionSyncWindow({
        backfillCursorAt: 1_000,
        historicalStartAt: 1_000,
        lastSyncedTransactionAt: 3_100_000,
        nowEpochSeconds: 3_100_000,
      }),
    ).toBeNull()
  })

  it('caps an overdue incremental window at the provider maximum', () => {
    expect(
      nextTransactionSyncWindow({
        backfillCursorAt: 1_000,
        historicalStartAt: 1_000,
        lastSyncedTransactionAt: 1_000,
        nowEpochSeconds: 10_000_000,
      }),
    ).toEqual({ fromEpochSeconds: 7_318_000, toEpochSeconds: 10_000_000 })
  })
})
