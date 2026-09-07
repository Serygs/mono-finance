import { MonobankApiError, malformedMonobankResponse } from './errors'
import type {
  ClientAccountSnapshot,
  TransactionSourceRecord,
} from './internal-dtos'
import { mapProviderClientInfo, mapProviderStatement } from './mappers'
import {
  MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS,
  type MonobankRequestGate,
} from './rate-limit'
import { parseProviderClientInfo, parseProviderStatement } from './validation'

const MONOBANK_API_BASE_URL = 'https://api.monobank.ua'
const DEFAULT_TIMEOUT_MILLISECONDS = 10_000
const MAXIMUM_STATEMENT_PERIOD_SECONDS = 2_682_000
const CLIENT_INFO_SCOPE = 'client-info'
const STATEMENT_SCOPE = 'statement'

export interface StatementRequest {
  accountId: string
  fromEpochSeconds: number
  toEpochSeconds?: number
}

export interface MonobankClient {
  getClientInfo(): Promise<ClientAccountSnapshot>
  getStatement(request: StatementRequest): Promise<TransactionSourceRecord[]>
}

interface HttpMonobankClientOptions {
  token: string
  requestGate: MonobankRequestGate
  fetcher?: typeof fetch
  timeoutMilliseconds?: number
  now?: () => number
}

function retryAfterSeconds(
  response: Response,
  nowMilliseconds: number,
): number {
  const value = response.headers.get('Retry-After')
  if (value === null) {
    return MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS
  }

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds)
  }

  const retryAt = Date.parse(value)
  if (Number.isNaN(retryAt)) {
    return MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS
  }
  return Math.max(0, Math.ceil((retryAt - nowMilliseconds) / 1_000))
}

function validateStatementRequest(request: StatementRequest): void {
  if (request.accountId.length === 0) {
    throw new MonobankApiError(
      'invalid_request',
      'A Monobank account identifier is required.',
      { retryable: false },
    )
  }

  if (
    !Number.isSafeInteger(request.fromEpochSeconds) ||
    request.fromEpochSeconds < 0 ||
    (request.toEpochSeconds !== undefined &&
      (!Number.isSafeInteger(request.toEpochSeconds) ||
        request.toEpochSeconds < request.fromEpochSeconds ||
        request.toEpochSeconds - request.fromEpochSeconds >
          MAXIMUM_STATEMENT_PERIOD_SECONDS))
  ) {
    throw new MonobankApiError(
      'invalid_request',
      'The Monobank statement period is invalid.',
      { retryable: false },
    )
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

export class HttpMonobankClient implements MonobankClient {
  private readonly token: string
  private readonly requestGate: MonobankRequestGate
  private readonly fetcher: typeof fetch
  private readonly timeoutMilliseconds: number
  private readonly now: () => number

  constructor(options: HttpMonobankClientOptions) {
    this.token = options.token.trim()
    this.requestGate = options.requestGate
    this.fetcher = options.fetcher ?? fetch
    this.timeoutMilliseconds =
      options.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MILLISECONDS
    this.now = options.now ?? Date.now
  }

  async getClientInfo(): Promise<ClientAccountSnapshot> {
    await this.requestGate.acquire(
      CLIENT_INFO_SCOPE,
      MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS,
    )
    const payload = await this.requestJson(
      '/personal/client-info',
      CLIENT_INFO_SCOPE,
    )
    return mapProviderClientInfo(parseProviderClientInfo(payload))
  }

  async getStatement(
    request: StatementRequest,
  ): Promise<TransactionSourceRecord[]> {
    validateStatementRequest(request)
    await this.requestGate.acquire(
      STATEMENT_SCOPE,
      MONOBANK_MINIMUM_REQUEST_INTERVAL_SECONDS,
    )

    const pathSegments = [
      '/personal/statement',
      encodeURIComponent(request.accountId),
      request.fromEpochSeconds.toString(),
    ]
    if (request.toEpochSeconds !== undefined) {
      pathSegments.push(request.toEpochSeconds.toString())
    }

    const payload = await this.requestJson(
      pathSegments.join('/'),
      STATEMENT_SCOPE,
    )
    return mapProviderStatement(parseProviderStatement(payload))
  }

  private async requestJson(path: string, scope: string): Promise<unknown> {
    const abortController = new AbortController()
    const timeout = setTimeout(
      () => abortController.abort(),
      this.timeoutMilliseconds,
    )

    try {
      let response: Response
      try {
        response = await this.fetcher(
          new Request(`${MONOBANK_API_BASE_URL}${path}`, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'X-Token': this.token,
            },
            signal: abortController.signal,
          }),
        )
      } catch (error) {
        if (isAbortError(error)) {
          throw new MonobankApiError(
            'timeout',
            'The Monobank request timed out.',
            { retryable: true, cause: error },
          )
        }
        throw new MonobankApiError(
          'remote_api_error',
          'Monobank could not be reached.',
          { retryable: true, cause: error },
        )
      }

      if (response.status === 401 || response.status === 403) {
        throw new MonobankApiError(
          'unauthorized_token',
          'Monobank credentials were rejected.',
          { retryable: false, status: response.status },
        )
      }

      if (response.status === 429) {
        const retryAfter = retryAfterSeconds(response, this.now())
        await this.requestGate.defer(scope, retryAfter)
        throw new MonobankApiError(
          'rate_limit',
          'Monobank rate limit was reached.',
          {
            retryable: true,
            retryAfterSeconds: retryAfter,
            status: response.status,
          },
        )
      }

      if (!response.ok) {
        throw new MonobankApiError(
          'remote_api_error',
          'Monobank returned an unsuccessful response.',
          {
            retryable: response.status >= 500,
            status: response.status,
          },
        )
      }

      try {
        return (await response.json()) as unknown
      } catch (error) {
        if (isAbortError(error)) {
          throw new MonobankApiError(
            'timeout',
            'The Monobank request timed out.',
            { retryable: true, cause: error },
          )
        }
        throw malformedMonobankResponse(error)
      }
    } finally {
      clearTimeout(timeout)
    }
  }
}
