import { app } from './app'
import { createTransactionSyncService } from './services/transaction-sync-service-factory'

export default {
  fetch(request, environment, executionContext) {
    return app.fetch(request, environment as never, executionContext)
  },
  scheduled(_controller, environment, executionContext) {
    executionContext.waitUntil(
      createTransactionSyncService(environment as never).synchronizeNext(null),
    )
  },
} satisfies ExportedHandler<Env>
