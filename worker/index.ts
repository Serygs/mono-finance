import { app } from './app'
import { createTransactionSyncService } from './services/transaction-sync-service-factory'
import { logError, logEvent } from './common/observability'

export default {
  fetch(request, environment, executionContext) {
    return app.fetch(request, environment as never, executionContext)
  },
  scheduled(_controller, environment, executionContext) {
    executionContext.waitUntil(runScheduledSync(environment as never))
  },
} satisfies ExportedHandler<Env>

async function runScheduledSync(environment: Env): Promise<void> {
  const startedAt = Date.now()
  try {
    const result = await createTransactionSyncService(
      environment as never,
    ).synchronizeNext(null)
    logEvent('scheduled_transaction_sync_completed', {
      accountId: result.accountId ?? undefined,
      durationMs: Date.now() - startedAt,
      importedCount: result.importedCount,
      skippedDuplicateCount: result.skippedDuplicateCount,
      status: result.status,
    })
  } catch {
    logError('scheduled_transaction_sync_failed', {
      durationMs: Date.now() - startedAt,
    })
  }
}
