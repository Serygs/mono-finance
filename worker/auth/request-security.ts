import { AuthenticationError } from './auth-service'

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin')
  if (origin !== null && origin !== new URL(request.url).origin) {
    throw new AuthenticationError('invalid_request', 400, 'Invalid request.')
  }
}

export function clientIdentifier(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'unknown-client'
}
