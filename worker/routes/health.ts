import type { Context } from 'hono'

import { success } from '../common/api-response'
import type { AuthEnvironment } from '../common/environment'

export function healthHandler(context: Context<{ Bindings: AuthEnvironment }>) {
  return context.json(success({ status: 'ok' as const }))
}
