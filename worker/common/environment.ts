export interface AppEnvironment extends Omit<Env, 'APP_ENV'> {
  APP_ENV: 'development' | 'production'
  APP_VERSION: Env['APP_VERSION']
  WORKER_VERSION: WorkerVersionMetadata
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

/** Monobank credentials remain available only to Worker integration code. */
export type MonobankEnvironment = AuthEnvironment & Pick<Env, 'MONOBANK_TOKEN'>

export type VisualEnvironment = MonobankEnvironment & { ASSETS: R2Bucket }
