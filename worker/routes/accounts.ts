import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import { MonobankApiError } from '../monobank/errors'
import type { AccountService } from '../services/account-service'

export type AccountContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function listAccountsHandler(
  context: AccountContext,
  service: AccountService,
) {
  const accounts = await service.list(context.get('authenticatedUser').id)
  return noStore(context.json(success({ accounts })))
}

export async function synchronizeAccountsHandler(
  context: AccountContext,
  service: AccountService,
) {
  try {
    const accounts = await service.synchronize(
      context.get('authenticatedUser').id,
    )
    return noStore(context.json(success({ accounts })))
  } catch (error) {
    if (error instanceof MonobankApiError) {
      return monobankFailure(context, error)
    }
    throw error
  }
}

function monobankFailure(context: AccountContext, error: MonobankApiError) {
  if (error.code === 'rate_limit') {
    if (error.retryAfterSeconds !== undefined) {
      context.header('Retry-After', error.retryAfterSeconds.toString())
    }
    return noStore(
      context.json(
        failure(
          'sync_rate_limited',
          'Account sync is temporarily rate limited.',
        ),
        429,
      ),
    )
  }

  if (error.code === 'timeout') {
    return noStore(
      context.json(
        failure('sync_timeout', 'Account sync timed out. Try again later.'),
        504,
      ),
    )
  }

  return noStore(
    context.json(
      failure(
        'sync_unavailable',
        'Accounts could not be synchronized. Try again later.',
      ),
      502,
    ),
  )
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
