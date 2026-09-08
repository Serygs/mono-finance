import { describe, expect, it } from 'vitest'

import { safeErrorLogFields } from './observability'

describe('safeErrorLogFields', () => {
  it('redacts credential bindings, bearer values, and URL queries', () => {
    const error = new Error(
      'SETUP_TOKEN=setup-value SESSION_TOKEN_PEPPER=pepper-value Authorization: Bearer bearer-value https://example.com/path?token=query-value',
    )

    const fields = safeErrorLogFields(error)
    const serialized = JSON.stringify(fields)

    expect(fields['errorMessage']).toBe(
      'SETUP_TOKEN=[REDACTED] SESSION_TOKEN_PEPPER=[REDACTED] Authorization:[REDACTED] https://example.com/path?[REDACTED]',
    )
    expect(serialized).not.toContain('setup-value')
    expect(serialized).not.toContain('pepper-value')
    expect(serialized).not.toContain('bearer-value')
    expect(serialized).not.toContain('query-value')
  })

  it('omits messages when the caller marks an error as sensitive', () => {
    const error = new Error('sensitive SQL statement', {
      cause: new Error('sensitive database cause'),
    })

    expect(safeErrorLogFields(error, { includeMessage: false })).toEqual({
      causeName: 'Error',
      errorName: 'Error',
    })
  })
})
