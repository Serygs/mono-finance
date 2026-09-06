export interface AppEnvironment extends Env {
  APP_ENV: 'development' | 'production'
}

/**
 * The D1 binding is intentionally typed before it is provisioned. Phase 3 must
 * add the matching binding to each Wrangler environment; do not add a fake ID.
 */
export interface FutureDataEnvironment extends AppEnvironment {
  DB: D1Database
}
