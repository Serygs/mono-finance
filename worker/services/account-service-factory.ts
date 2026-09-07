import type { MonobankEnvironment } from '../common/environment'
import { createMonobankClient } from '../monobank/factory'
import { D1AccountsRepository } from '../repositories/accounts-repository'
import { AccountService } from './account-service'

export function createAccountService(
  environment: MonobankEnvironment,
): AccountService {
  return new AccountService(
    new D1AccountsRepository(environment.DB),
    createMonobankClient(environment),
  )
}
