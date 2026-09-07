import { Hono } from 'hono'

import { createAuthService } from './auth/auth-factory'
import {
  AuthenticationError,
  type AuthenticatedUser,
  type AuthService,
} from './auth/auth-service'
import { readCookie, SESSION_COOKIE_NAME } from './auth/cookies'
import { assertSameOrigin } from './auth/request-security'
import { failure } from './common/api-response'
import type { AuthEnvironment, MonobankEnvironment } from './common/environment'
import { applyApiSecurityHeaders } from './common/security-headers'
import type { AccountService } from './services/account-service'
import { createAccountService } from './services/account-service-factory'
import type { TransactionSyncService } from './services/transaction-sync-service'
import { createTransactionSyncService } from './services/transaction-sync-service-factory'
import type { TransactionQueryService } from './services/transaction-query-service'
import { createTransactionQueryService } from './services/transaction-query-service-factory'
import type { TransactionCorrectionService } from './services/transaction-correction-service'
import { createTransactionCorrectionService } from './services/transaction-correction-service-factory'
import type { CategoryService } from './services/category-service'
import { createCategoryService } from './services/category-service-factory'
import type { CompensationService } from './services/compensation-service'
import { createCompensationService } from './services/compensation-service-factory'
import type { AnalyticsService } from './services/analytics-service'
import { createAnalyticsService } from './services/analytics-service-factory'
import type { CurrencyPreferencesService } from './services/currency-preferences-service'
import { createCurrencyPreferencesService } from './services/currency-preferences-service-factory'
import type { ExchangeRateService } from './services/exchange-rate-service'
import { createExchangeRateService } from './services/exchange-rate-service-factory'
import {
  listAccountsHandler,
  synchronizeAccountsHandler,
} from './routes/accounts'
import {
  currentSessionHandler,
  loginHandler,
  logoutHandler,
  setupHandler,
} from './routes/auth'
import { healthHandler } from './routes/health'
import {
  getTransactionSyncStatusHandler,
  synchronizeTransactionsHandler,
} from './routes/transactions'
import { listTransactionsHandler } from './routes/transaction-list'
import {
  excludeTransactionHandler,
  resetAdjustmentHandler,
  restoreTransactionHandler,
  saveAdjustmentHandler,
} from './routes/transaction-corrections'
import {
  createCategoryHandler,
  deleteCategoryHandler,
  listCategoriesHandler,
  resetTransactionCategoryHandler,
  saveTransactionCategoryHandler,
  updateCategoryHandler,
} from './routes/categories'
import {
  compensationDetailsHandler,
  linkCompensationHandler,
  unlinkCompensationHandler,
} from './routes/compensations'
import {
  analyticsBreakdownsHandler,
  analyticsOverviewHandler,
  analyticsTrendsHandler,
} from './routes/analytics'
import {
  getCurrencyPreferencesHandler,
  setCurrencyPreferencesHandler,
  synchronizeExchangeRatesHandler,
} from './routes/currency-preferences'

const publicApiPaths = new Set([
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/setup',
  '/api/health',
])

export function createApp(
  authServiceFactory: (
    environment: AuthEnvironment,
  ) => AuthService = createAuthService,
  accountServiceFactory: (
    environment: MonobankEnvironment,
  ) => AccountService = createAccountService,
  transactionSyncServiceFactory: (
    environment: MonobankEnvironment,
  ) => TransactionSyncService = createTransactionSyncService,
  transactionQueryServiceFactory: (
    environment: MonobankEnvironment,
  ) => TransactionQueryService = createTransactionQueryService,
  transactionCorrectionServiceFactory: (
    environment: MonobankEnvironment,
  ) => TransactionCorrectionService = createTransactionCorrectionService,
  categoryServiceFactory: (
    environment: MonobankEnvironment,
  ) => CategoryService = createCategoryService,
  compensationServiceFactory: (
    environment: MonobankEnvironment,
  ) => CompensationService = createCompensationService,
  analyticsServiceFactory: (
    environment: MonobankEnvironment,
  ) => AnalyticsService = createAnalyticsService,
  currencyPreferencesServiceFactory: (
    environment: MonobankEnvironment,
  ) => CurrencyPreferencesService = createCurrencyPreferencesService,
  exchangeRateServiceFactory: (
    environment: MonobankEnvironment,
  ) => ExchangeRateService = createExchangeRateService,
) {
  const app = new Hono<{
    Bindings: MonobankEnvironment
    Variables: { authenticatedUser: AuthenticatedUser }
  }>()

  app.use('/api/*', async (context, next) => {
    try {
      await next()
    } finally {
      applyApiSecurityHeaders(context.res.headers, context.env)
    }
  })

  app.use('/api/*', async (context, next) => {
    if (publicApiPaths.has(new URL(context.req.url).pathname)) {
      await next()
      return
    }

    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)) {
        assertSameOrigin(context.req.raw)
      }
      const sessionToken = readCookie(
        context.req.raw.headers.get('Cookie') ?? undefined,
        SESSION_COOKIE_NAME,
      )
      if (sessionToken === undefined) {
        throw new AuthenticationError(
          'unauthenticated',
          401,
          'Authentication is required.',
        )
      }
      const authenticatedUser = await authServiceFactory(
        context.env,
      ).requireSession(sessionToken)
      context.set('authenticatedUser', authenticatedUser)
      await next()
    } catch (error) {
      if (error instanceof AuthenticationError) {
        const response = context.json(
          failure(error.code, error.publicMessage),
          error.status,
        )
        response.headers.set('Cache-Control', 'no-store')
        return response
      }
      throw error
    }
  })

  app.get('/api/health', healthHandler)
  app.post('/api/auth/setup', (context) =>
    setupHandler(context, authServiceFactory(context.env)),
  )
  app.post('/api/auth/login', (context) =>
    loginHandler(context, authServiceFactory(context.env)),
  )
  app.post('/api/auth/logout', (context) =>
    logoutHandler(context, authServiceFactory(context.env)),
  )
  app.get('/api/auth/session', (context) =>
    currentSessionHandler(context, authServiceFactory(context.env)),
  )
  app.get('/api/accounts', (context) =>
    listAccountsHandler(context, accountServiceFactory(context.env)),
  )
  app.get('/api/transactions', (context) =>
    listTransactionsHandler(
      context,
      transactionQueryServiceFactory(context.env),
    ),
  )
  app.get('/api/analytics/overview', (context) =>
    analyticsOverviewHandler(context, analyticsServiceFactory(context.env)),
  )
  app.get('/api/analytics/breakdowns', (context) =>
    analyticsBreakdownsHandler(context, analyticsServiceFactory(context.env)),
  )
  app.get('/api/analytics/trends', (context) =>
    analyticsTrendsHandler(context, analyticsServiceFactory(context.env)),
  )
  app.get('/api/preferences/currency', (context) =>
    getCurrencyPreferencesHandler(
      context,
      currencyPreferencesServiceFactory(context.env),
    ),
  )
  app.put('/api/preferences/currency', (context) =>
    setCurrencyPreferencesHandler(
      context,
      currencyPreferencesServiceFactory(context.env),
    ),
  )
  app.post('/api/exchange-rates/sync', (context) =>
    synchronizeExchangeRatesHandler(
      context,
      exchangeRateServiceFactory(context.env),
    ),
  )
  app.get('/api/categories', (context) =>
    listCategoriesHandler(context, categoryServiceFactory(context.env)),
  )
  app.post('/api/categories', (context) =>
    createCategoryHandler(context, categoryServiceFactory(context.env)),
  )
  app.put('/api/categories/:categoryId', (context) =>
    updateCategoryHandler(context, categoryServiceFactory(context.env)),
  )
  app.delete('/api/categories/:categoryId', (context) =>
    deleteCategoryHandler(context, categoryServiceFactory(context.env)),
  )
  app.put('/api/transactions/:transactionId/category', (context) =>
    saveTransactionCategoryHandler(
      context,
      categoryServiceFactory(context.env),
    ),
  )
  app.delete('/api/transactions/:transactionId/category', (context) =>
    resetTransactionCategoryHandler(
      context,
      categoryServiceFactory(context.env),
    ),
  )
  app.put('/api/transactions/:transactionId/adjustment', (context) =>
    saveAdjustmentHandler(
      context,
      transactionCorrectionServiceFactory(context.env),
    ),
  )
  app.delete('/api/transactions/:transactionId/adjustment', (context) =>
    resetAdjustmentHandler(
      context,
      transactionCorrectionServiceFactory(context.env),
    ),
  )
  app.put('/api/transactions/:transactionId/exclusion', (context) =>
    excludeTransactionHandler(
      context,
      transactionCorrectionServiceFactory(context.env),
    ),
  )
  app.delete('/api/transactions/:transactionId/exclusion', (context) =>
    restoreTransactionHandler(
      context,
      transactionCorrectionServiceFactory(context.env),
    ),
  )
  app.get('/api/transactions/:transactionId/compensations', (context) =>
    compensationDetailsHandler(
      context,
      compensationServiceFactory(context.env),
    ),
  )
  app.post('/api/transactions/:transactionId/compensations', (context) =>
    linkCompensationHandler(context, compensationServiceFactory(context.env)),
  )
  app.delete(
    '/api/transactions/:transactionId/compensations/:linkId',
    (context) =>
      unlinkCompensationHandler(
        context,
        compensationServiceFactory(context.env),
      ),
  )
  app.post('/api/sync/accounts', (context) =>
    synchronizeAccountsHandler(context, accountServiceFactory(context.env)),
  )
  app.get('/api/sync/transactions/status', (context) =>
    getTransactionSyncStatusHandler(
      context,
      transactionSyncServiceFactory(context.env),
    ),
  )
  app.post('/api/sync/transactions', (context) =>
    synchronizeTransactionsHandler(
      context,
      transactionSyncServiceFactory(context.env),
    ),
  )

  app.notFound((context) =>
    context.json(failure('not_found', 'Resource not found.'), 404),
  )

  app.onError((_error, context) => {
    console.error(
      JSON.stringify({
        message: 'Unhandled API error',
        path: new URL(context.req.url).pathname,
      }),
    )
    const response = context.json(
      failure('internal_error', 'An unexpected error occurred.'),
      500,
    )
    applyApiSecurityHeaders(response.headers, context.env)
    return response
  })

  return app
}

export const app = createApp()
