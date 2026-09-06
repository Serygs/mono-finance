import { Hono } from 'hono'

import { failure } from './common/api-response'
import type { AppEnvironment } from './common/environment'
import { healthHandler } from './routes/health'

export const app = new Hono<{ Bindings: AppEnvironment }>()

app.get('/api/health', healthHandler)

app.notFound((context) =>
  context.json(failure('not_found', 'Resource not found.'), 404),
)

app.onError((error, context) => {
  console.error('Unhandled API error', { message: error.message })
  return context.json(
    failure('internal_error', 'An unexpected error occurred.'),
    500,
  )
})
