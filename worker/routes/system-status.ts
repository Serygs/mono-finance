import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import { SystemStatusService } from '../services/system-status-service'

export async function systemStatusHandler(
  context: Context<{
    Bindings: MonobankEnvironment
    Variables: { authenticatedUser: AuthenticatedUser }
  }>,
) {
  const version = context.env.WORKER_VERSION?.id ?? 'development'
  const status = await new SystemStatusService(context.env.DB, {
    frontend: context.env.APP_VERSION,
    worker: version,
  }).get(context.get('authenticatedUser').id)
  const response = context.json(success(status))
  response.headers.set('Cache-Control', 'no-store')
  return response
}
