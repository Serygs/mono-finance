import type { Context } from 'hono'

import { success } from '../common/api-response'
import type { AppEnvironment } from '../common/environment'

export function healthHandler(context: Context<{ Bindings: AppEnvironment }>) {
  return context.json(success({ status: 'ok' as const }))
}
