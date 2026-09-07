import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import { MonobankApiError } from '../monobank/errors'
import type { TransactionSyncService } from '../services/transaction-sync-service'

type TransactionSyncContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function getTransactionSyncStatusHandler(
  context: TransactionSyncContext,
  service: TransactionSyncService,
) {
  const syncStates = await service.listStatus(
    context.get('authenticatedUser').id,
  )
  return noStore(context.json(success({ syncStates })))
}

export async function synchronizeTransactionsHandler(
  context: TransactionSyncContext,
  service: TransactionSyncService,
) {
  try {
    const sync = await service.synchronizeNext(
      context.get('authenticatedUser').id,
    )
    return noStore(context.json(success({ sync })))
  } catch (error) {
    if (error instanceof MonobankApiError) {
      return monobankFailure(context, error)
    }
    throw error
  }
}

function monobankFailure(
  context: TransactionSyncContext,
  error: MonobankApiError,
) {
  if (error.code === 'rate_limit') {
    if (error.retryAfterSeconds !== undefined) {
      context.header('Retry-After', error.retryAfterSeconds.toString())
    }
    return noStore(
      context.json(
        failure(
          'sync_rate_limited',
          'Transaction sync is temporarily rate limited.',
        ),
        429,
      ),
    )
  }
  if (error.code === 'timeout') {
    return noStore(
      context.json(
        failure('sync_timeout', 'Transaction sync timed out. Try again later.'),
        504,
      ),
    )
  }
  return noStore(
    context.json(
      failure(
        'sync_unavailable',
        'Transactions could not be synchronized. Try again later.',
      ),
      502,
    ),
  )
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
