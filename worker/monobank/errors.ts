export type MonobankErrorCode =
  | 'invalid_request'
  | 'unauthorized_token'
  | 'rate_limit'
  | 'remote_api_error'
  | 'malformed_response'
  | 'timeout'

interface MonobankApiErrorOptions {
  retryable: boolean
  retryAfterSeconds?: number
  status?: number
  cause?: unknown
}

export class MonobankApiError extends Error {
  readonly code: MonobankErrorCode
  readonly retryable: boolean
  readonly retryAfterSeconds?: number
  readonly status?: number

  constructor(
    code: MonobankErrorCode,
    message: string,
    options: MonobankApiErrorOptions,
  ) {
    super(message, { cause: options.cause })
    this.name = 'MonobankApiError'
    this.code = code
    this.retryable = options.retryable
    if (options.retryAfterSeconds !== undefined) {
      this.retryAfterSeconds = options.retryAfterSeconds
    }
    if (options.status !== undefined) {
      this.status = options.status
    }
  }
}

export function malformedMonobankResponse(cause?: unknown): MonobankApiError {
  return new MonobankApiError(
    'malformed_response',
    'Monobank returned an invalid response.',
    { retryable: false, cause },
  )
}
