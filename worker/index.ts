import { app } from './app'

export default {
  fetch(request, environment, executionContext) {
    return app.fetch(request, environment as never, executionContext)
  },
} satisfies ExportedHandler<Env>
