import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import type {
  AnalyticsFilters,
  AnalyticsService,
} from '../services/analytics-service'

type AnalyticsContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function analyticsOverviewHandler(
  context: AnalyticsContext,
  service: AnalyticsService,
) {
  return respond(context, () => service.overview(filters(context)))
}
export async function analyticsBreakdownsHandler(
  context: AnalyticsContext,
  service: AnalyticsService,
) {
  return respond(context, () => service.breakdowns(filters(context)))
}
export async function analyticsTrendsHandler(
  context: AnalyticsContext,
  service: AnalyticsService,
) {
  return respond(context, () => service.trends(filters(context)))
}

async function respond(
  context: AnalyticsContext,
  action: () => Promise<unknown>,
): Promise<Response> {
  try {
    return noStore(context.json(success(await action())))
  } catch (error) {
    if (error instanceof AnalyticsValidationError)
      return noStore(
        context.json(
          failure('validation_error', 'Invalid analytics filters.'),
          400,
        ),
      )
    throw error
  }
}
function filters(context: AnalyticsContext): AnalyticsFilters {
  const query = context.req.queries()
  const accountIds = query['accountId'] ?? []
  const baseCurrencyCode = currency(single(query['baseCurrency']))
  const dateFrom = epoch(single(query['dateFrom']))
  const dateTo = epoch(single(query['dateTo']))
  if (
    accountIds.length > 20 ||
    accountIds.some((value) => value.length === 0 || value.length > 128) ||
    baseCurrencyCode === null ||
    dateFrom === null ||
    dateTo === null ||
    dateFrom > dateTo ||
    dateTo - dateFrom > 366 * 86_400
  )
    throw new AnalyticsValidationError()
  return {
    accountIds: [...new Set(accountIds)],
    ...(baseCurrencyCode === undefined ? {} : { baseCurrencyCode }),
    dateFrom,
    dateTo,
    userId: context.get('authenticatedUser').id,
  }
}
function currency(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return /^[A-Za-z]{3}$/.test(value) ? value.toUpperCase() : null
}
function single(values: string[] | undefined): string | undefined {
  return values?.length === 1 ? values[0] : undefined
}
function epoch(value: string | undefined): number | null {
  if (value === undefined || !/^\d+$/.test(value)) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}
function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
class AnalyticsValidationError extends Error {}
