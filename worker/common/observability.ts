export const REQUEST_ID_HEADER = 'X-Request-Id'

export interface ObservabilityContext {
  requestId: string
}

export interface ErrorLogOptions {
  includeMessage?: boolean
}

type LogFields = Record<string, boolean | number | string | undefined>

export function requestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)
  return supplied !== null && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID()
}

export function logEvent(event: string, fields: LogFields = {}): void {
  console.log(
    JSON.stringify({
      event,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
    }),
  )
}

export function logError(event: string, fields: LogFields = {}): void {
  console.error(
    JSON.stringify({
      event,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
    }),
  )
}

export function safeErrorLogFields(
  error: unknown,
  options: ErrorLogOptions = {},
): LogFields {
  if (!(error instanceof Error)) {
    return {
      errorName: 'NonErrorThrown',
      errorType: typeof error,
    }
  }

  const cause = error.cause instanceof Error ? error.cause : undefined
  const includeMessage = options.includeMessage ?? true

  return {
    errorName: safeErrorName(error.name),
    errorCode: safeErrorCode(error),
    ...(includeMessage
      ? { errorMessage: safeErrorMessage(error.message) }
      : {}),
    ...(cause === undefined
      ? {}
      : {
          causeName: safeErrorName(cause.name),
          causeCode: safeErrorCode(cause),
          ...(includeMessage
            ? { causeMessage: safeErrorMessage(cause.message) }
            : {}),
        }),
  }
}

function safeErrorName(name: string): string {
  return /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(name) ? name : 'Error'
}

function safeErrorCode(error: Error): string | undefined {
  const code = (error as Error & { code?: unknown }).code
  if (typeof code === 'number' && Number.isFinite(code)) {
    return code.toString()
  }
  return typeof code === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(code)
    ? code
    : undefined
}

function safeErrorMessage(message: string): string {
  const normalized = message.replace(/[\r\n\t]+/gu, ' ').trim()
  const redacted = normalized
    .replace(
      /\b([A-Za-z0-9_]*(?:authorization|cookie|password|pepper|secret|token)[A-Za-z0-9_]*)\s*([:=])\s*(?:Bearer\s+)?[^\s,;]+/giu,
      '$1$2[REDACTED]',
    )
    .replace(/\bBearer\s+[^\s,;]+/giu, 'Bearer [REDACTED]')
    .replace(/(https?:\/\/[^\s?]+)\?[^\s]+/giu, '$1?[REDACTED]')

  return redacted.length <= 500 ? redacted : `${redacted.slice(0, 497)}...`
}

export function recordMetric(
  dataset: AnalyticsEngineDataset | undefined,
  event: string,
  outcome: string,
  durationMs?: number,
): void {
  try {
    dataset?.writeDataPoint({
      blobs: [event, outcome],
      ...(durationMs === undefined ? {} : { doubles: [durationMs] }),
    })
  } catch {
    // Observability must never make a private-finance request fail.
  }
}
