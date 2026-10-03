import { safeErrorLogFields } from './observability'

// Never log raw D1 messages: they can contain SQL and bound financial data.
export function d1ErrorLogFields(error: Error) {
  const errors: Error[] = []
  let current: unknown = error
  while (
    current instanceof Error &&
    errors.length < 8 &&
    !errors.includes(current)
  ) {
    errors.push(current)
    current = current.cause
  }
  const isD1Failure = errors.some((entry) => {
    const code = (entry as Error & { code?: unknown }).code
    return (
      /^D1_(?:ERROR|EXEC_ERROR|TYPE_ERROR|COLUMN_NOTFOUND)\b/u.test(
        entry.message,
      ) ||
      (typeof code === 'string' && code.startsWith('SQLITE_'))
    )
  })
  if (!isD1Failure) return undefined

  const messages = errors.map((entry) => entry.message).join('\n')
  let reason = 'unknown'
  let hint = 'Inspect D1 health and the failing repository operation.'
  if (/no such table\s*:/iu.test(messages)) {
    reason = 'missing_table'
  } else if (
    /no such column\s*:|has no column named|D1_COLUMN_NOTFOUND/iu.test(messages)
  ) {
    reason = 'missing_column'
  } else if (/syntax error|incomplete input/iu.test(messages)) {
    reason = 'invalid_sql'
    hint = 'Check SQL syntax and migration compatibility.'
  } else if (/constraint failed/iu.test(messages)) {
    reason = 'constraint_violation'
    hint = 'Check repository constraints and write consistency.'
  } else if (/D1_TYPE_ERROR/iu.test(messages)) {
    reason = 'invalid_binding_type'
    hint = 'Check bound parameter types; use null instead of undefined.'
  } else if (/exceeded.*(?:limit|size)|storage limit/iu.test(messages)) {
    reason = 'limit_exceeded'
    hint = 'Check D1 usage and resource limits.'
  } else if (/overloaded|too many requests queued/iu.test(messages)) {
    reason = 'overloaded'
    hint = 'Check D1 load and query performance.'
  } else if (/timeout|timed out/iu.test(messages)) {
    reason = 'timeout'
    hint = 'Check D1 availability and query performance.'
  } else if (
    /network connection lost|reset|replica disconnected|transient issue/iu.test(
      messages,
    )
  ) {
    reason = 'unavailable'
    hint = 'Check D1 availability; retry only safe, idempotent operations.'
  }
  if (reason === 'missing_table' || reason === 'missing_column') {
    hint = 'Apply pending D1 migrations to the database used by this Worker.'
  }

  return {
    ...safeErrorLogFields(error, { includeMessage: false }),
    databaseBinding: 'DB',
    databaseReason: reason,
    diagnosticHint: hint,
  }
}
