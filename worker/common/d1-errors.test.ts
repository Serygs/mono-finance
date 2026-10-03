import { describe, expect, it } from 'vitest'
import { d1ErrorLogFields } from './d1-errors'

describe('D1 error diagnostics', () => {
  it.each([
    ['D1_ERROR: no such column: accounts.balance_updated_at', 'missing_column'],
    ['D1_ERROR: no such table: transaction_sync_windows', 'missing_table'],
    ['D1_EXEC_ERROR: incomplete input', 'invalid_sql'],
    ['D1_TYPE_ERROR: unsupported value', 'invalid_binding_type'],
    ['D1_COLUMN_NOTFOUND: column missing', 'missing_column'],
    ['D1_ERROR: UNIQUE constraint failed: accounts.id', 'constraint_violation'],
    ['D1_ERROR: exceeded maximum DB size', 'limit_exceeded'],
    ['D1_ERROR: D1 DB is overloaded', 'overloaded'],
    ['D1_ERROR: operation exceeded timeout', 'timeout'],
    ['D1_ERROR: Network connection lost.', 'unavailable'],
    ['D1_ERROR: unrecognized failure', 'unknown'],
  ])('classifies %s without logging the raw diagnostic', (message, reason) => {
    const fields = d1ErrorLogFields(new Error(message))
    expect(fields?.databaseReason).toBe(reason)
    expect(fields?.diagnosticHint).toBeTruthy()
    expect(JSON.stringify(fields)).not.toContain(message)
  })

  it('recognizes nested causes and omits SQL, credentials and financial data', () => {
    const sensitive =
      'SELECT password_hash FROM users WHERE email = private@example.com token=private-token'
    const error = new Error(sensitive, {
      cause: new Error('repository failed', {
        cause: new Error(`D1_ERROR: no such table: users ${sensitive}`),
      }),
    })
    const fields = d1ErrorLogFields(error)
    expect(fields?.databaseReason).toBe('missing_table')
    expect(JSON.stringify(fields)).not.toMatch(
      /SELECT|password_hash|private@example|private-token/u,
    )
  })

  it('recognizes SQLite codes and handles circular causes', () => {
    const error = Object.assign(
      new Error('no such column: balance_updated_at'),
      { code: 'SQLITE_ERROR' },
    )
    error.cause = error
    expect(d1ErrorLogFields(error)?.databaseReason).toBe('missing_column')
  })

  it('leaves non-database errors to the standard handler', () => {
    expect(d1ErrorLogFields(new Error('network failed'))).toBeUndefined()
  })
})
