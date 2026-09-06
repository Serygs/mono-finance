import { Hono } from 'hono'

import { createAuthService } from './auth/auth-factory'
import { AuthenticationError, type AuthService } from './auth/auth-service'
import { readCookie, SESSION_COOKIE_NAME } from './auth/cookies'
import { assertSameOrigin } from './auth/request-security'
import { failure } from './common/api-response'
import type { AuthEnvironment } from './common/environment'
import {
  currentSessionHandler,
  loginHandler,
  logoutHandler,
  setupHandler,
} from './routes/auth'
import { healthHandler } from './routes/health'

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
) {
  const app = new Hono<{ Bindings: AuthEnvironment }>()

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
      await authServiceFactory(context.env).requireSession(sessionToken)
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
    return context.json(
      failure('internal_error', 'An unexpected error occurred.'),
      500,
    )
  })

  return app
}

export const app = createApp()
