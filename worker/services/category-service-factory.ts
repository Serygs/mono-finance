import type { MonobankEnvironment } from '../common/environment'
import { D1CategoryRepository } from '../repositories/categories-repository'
import { CategoryService } from './category-service'
export function createCategoryService(
  environment: MonobankEnvironment,
): CategoryService {
  return new CategoryService(new D1CategoryRepository(environment.DB))
}
