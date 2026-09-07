import type { MonobankEnvironment } from '../common/environment'
import { D1TransactionsRepository } from '../repositories/transactions-repository'

import { TransactionQueryService } from './transaction-query-service'

export function createTransactionQueryService(
  environment: MonobankEnvironment,
): TransactionQueryService {
  return new TransactionQueryService(
    new D1TransactionsRepository(environment.DB),
  )
}
