import type { AppEnvironment } from './environment'

const API_CONTENT_SECURITY_POLICY =
  "base-uri 'none'; default-src 'none'; form-action 'none'; frame-ancestors 'none'"

/**
 * Applies a conservative policy to every API response, including public
 * health/authentication responses and errors. Financial API data must never
 * be stored by browser or edge caches.
 */
export function applyApiSecurityHeaders(
  headers: Headers,
  environment: Pick<AppEnvironment, 'APP_ENV'> | undefined,
): void {
  headers.set('Cache-Control', 'no-store')
  headers.set('Content-Security-Policy', API_CONTENT_SECURITY_POLICY)
  headers.set('Cross-Origin-Resource-Policy', 'same-origin')
  headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
  headers.set('Pragma', 'no-cache')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')

  if (environment?.APP_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000')
  }
}
