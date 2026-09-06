export interface AppEnvironment extends Env {
  APP_ENV: 'development' | 'production'
}

/**
 * Authentication cannot run until real D1 and secret bindings are provisioned
 * for an environment. Keep these values server-side; do not expose them to Vite.
 */
export interface AuthEnvironment extends AppEnvironment {
  DB: D1Database
  SESSION_TOKEN_PEPPER: string
  SETUP_TOKEN: string
}
