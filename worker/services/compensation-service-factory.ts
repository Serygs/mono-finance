import type { MonobankEnvironment } from '../common/environment'
import { D1CompensationRepository } from '../repositories/compensation-repository'
import { CompensationService } from './compensation-service'

export function createCompensationService(
  environment: MonobankEnvironment,
): CompensationService {
  return new CompensationService(new D1CompensationRepository(environment.DB))
}
