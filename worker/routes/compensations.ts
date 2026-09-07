import type { Context } from 'hono'
import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import {
  CompensationError,
  type CompensationService,
} from '../services/compensation-service'

type CompensationContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function compensationDetailsHandler(
  context: CompensationContext,
  service: CompensationService,
) {
  return operation(context, () =>
    service.getDetails(
      context.get('authenticatedUser').id,
      transactionId(context),
    ),
  )
}
export async function linkCompensationHandler(
  context: CompensationContext,
  service: CompensationService,
) {
  return operation(context, async () =>
    service.link(
      context.get('authenticatedUser').id,
      transactionId(context),
      await input(context.req.raw),
    ),
  )
}
export async function unlinkCompensationHandler(
  context: CompensationContext,
  service: CompensationService,
) {
  return operation(context, () =>
    service.unlink(
      context.get('authenticatedUser').id,
      transactionId(context),
      linkId(context),
    ),
  )
}
async function operation(
  context: CompensationContext,
  action: () => Promise<unknown>,
): Promise<Response> {
  try {
    return noStore(context.json(success(await action())))
  } catch (error) {
    if (!(error instanceof CompensationError)) throw error
    const status =
      error.code === 'transaction_not_found' || error.code === 'link_not_found'
        ? 404
        : 400
    return noStore(
      context.json(
        failure(
          status === 404 ? 'not_found' : 'validation_error',
          status === 404
            ? 'Resource was not found.'
            : 'Invalid compensation link.',
        ),
        status,
      ),
    )
  }
}
async function input(request: Request): Promise<{
  compensatedAmountMinor: number
  compensationTransactionId: string
}> {
  try {
    const value: unknown = await request.json()
    if (typeof value !== 'object' || value === null || Array.isArray(value))
      throw new CompensationError('invalid_compensation')
    const input = value as Record<string, unknown>
    if (
      typeof input['compensationTransactionId'] !== 'string' ||
      input['compensationTransactionId'].length === 0 ||
      input['compensationTransactionId'].length > 128 ||
      typeof input['compensatedAmountMinor'] !== 'number' ||
      !Number.isSafeInteger(input['compensatedAmountMinor'])
    )
      throw new CompensationError('invalid_compensation')
    return {
      compensationTransactionId: input['compensationTransactionId'],
      compensatedAmountMinor: input['compensatedAmountMinor'],
    }
  } catch (error) {
    if (error instanceof CompensationError) throw error
    throw new CompensationError('invalid_compensation')
  }
}
function transactionId(context: CompensationContext): string {
  return requiredParam(context, 'transactionId')
}
function linkId(context: CompensationContext): string {
  return requiredParam(context, 'linkId')
}
function requiredParam(context: CompensationContext, key: string): string {
  const value = context.req.param(key)
  if (value === undefined || value.length === 0 || value.length > 128)
    throw new CompensationError('invalid_compensation')
  return value
}
function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
