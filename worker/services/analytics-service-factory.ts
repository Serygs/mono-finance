import type { MonobankEnvironment } from '../common/environment'
import { D1AnalyticsRepository } from '../repositories/analytics-repository'

import { AnalyticsService } from './analytics-service'

export function createAnalyticsService(
  environment: MonobankEnvironment,
): AnalyticsService {
  return new AnalyticsService(new D1AnalyticsRepository(environment.DB))
}
