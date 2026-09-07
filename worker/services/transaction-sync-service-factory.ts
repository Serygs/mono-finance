import type { MonobankEnvironment } from '../common/environment'
import { createMonobankClient } from '../monobank/factory'
import { D1TransactionSyncRepository } from '../repositories/transaction-sync-repository'
import { TransactionSyncService } from './transaction-sync-service'

export function createTransactionSyncService(
  environment: MonobankEnvironment,
): TransactionSyncService {
  return new TransactionSyncService(
    new D1TransactionSyncRepository(environment.DB),
    createMonobankClient(environment),
  )
}
