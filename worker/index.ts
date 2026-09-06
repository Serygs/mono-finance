import { app } from './app'

export default {
  fetch(request, environment, executionContext) {
    return app.fetch(request, environment, executionContext)
  },
} satisfies ExportedHandler<Env>
