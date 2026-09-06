import type { AppEnvironment } from '../common/environment'

export const SESSION_COOKIE_NAME = 'mono_finance_session'

export function clearSessionCookie(environment: AppEnvironment): string {
  return buildCookie(environment, '', 0)
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (cookieHeader === undefined) {
    return undefined
  }

  for (const part of cookieHeader.split(';')) {
    const [key, ...value] = part.trim().split('=')
    if (key === name && value.length > 0) {
      return value.join('=')
    }
  }
  return undefined
}

export function sessionCookie(
  environment: AppEnvironment,
  token: string,
  maxAgeSeconds: number,
): string {
  return buildCookie(environment, token, maxAgeSeconds)
}

function buildCookie(
  environment: AppEnvironment,
  value: string,
  maxAgeSeconds: number,
): string {
  const attributes = [
    `${SESSION_COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (environment.APP_ENV === 'production') {
    attributes.push('Secure')
  }
  return attributes.join('; ')
}
