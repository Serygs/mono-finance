export const REQUEST_ID_HEADER = 'X-Request-Id'

export interface ObservabilityContext {
  requestId: string
}

export function requestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)
  return supplied !== null && /^[a-zA-Z0-9_-]{8,128}$/.test(supplied)
    ? supplied
    : crypto.randomUUID()
}

export function logEvent(
  event: string,
  fields: Record<string, boolean | number | string | undefined> = {},
): void {
  console.log(
    JSON.stringify({
      event,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
    }),
  )
}

export function logError(
  event: string,
  fields: Record<string, boolean | number | string | undefined> = {},
): void {
  console.error(
    JSON.stringify({
      event,
      ...Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined),
      ),
    }),
  )
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
