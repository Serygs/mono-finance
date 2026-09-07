import type { MonobankEnvironment } from '../common/environment'
import { D1TransactionCorrectionRepository } from '../repositories/transaction-corrections-repository'

import { TransactionCorrectionService } from './transaction-correction-service'

export function createTransactionCorrectionService(
  environment: MonobankEnvironment,
): TransactionCorrectionService {
  return new TransactionCorrectionService(
    new D1TransactionCorrectionRepository(environment.DB),
  )
}
