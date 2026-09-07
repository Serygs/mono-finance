import type { Context } from 'hono'

import {
  AuthenticationError,
  type AuthenticatedUser,
  type AuthService,
  SESSION_TTL_SECONDS,
} from '../auth/auth-service'
import {
  clearSessionCookie,
  readCookie,
  SESSION_COOKIE_NAME,
  sessionCookie,
} from '../auth/cookies'
import { assertSameOrigin, clientIdentifier } from '../auth/request-security'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'

type AuthContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function setupHandler(context: AuthContext, service: AuthService) {
  try {
    assertSameOrigin(context.req.raw)
    const setupToken = context.req.header('X-Setup-Token')
    if (
      setupToken === undefined ||
      !constantTimeTextEqual(setupToken, context.env.SETUP_TOKEN)
    ) {
      return noStore(
        context.json(
          failure('setup_unavailable', 'Initial setup is unavailable.'),
          409,
        ),
      )
    }
    const credentials = await readCredentials(context.req.raw)
    const user = await service.createOwner(
      credentials.email,
      credentials.password,
    )
    return noStore(context.json(success({ user }), 201))
  } catch (error) {
    return authenticationFailure(context, error)
  }
}

export async function loginHandler(context: AuthContext, service: AuthService) {
  try {
    assertSameOrigin(context.req.raw)
    const credentials = await readCredentials(context.req.raw)
    const session = await service.login(
      credentials.email,
      credentials.password,
      clientIdentifier(context.req.raw),
    )
    context.header(
      'Set-Cookie',
      sessionCookie(context.env, session.token, SESSION_TTL_SECONDS),
    )
    return noStore(context.json(success({ user: session.user })))
  } catch (error) {
    return authenticationFailure(context, error)
  }
}

export async function logoutHandler(
  context: AuthContext,
  service: AuthService,
) {
  try {
    assertSameOrigin(context.req.raw)
    await service.logout(readSessionToken(context.req.raw))
    context.header('Set-Cookie', clearSessionCookie(context.env))
    return noStore(context.json(success({ loggedOut: true as const })))
  } catch (error) {
    return authenticationFailure(context, error)
  }
}

export async function currentSessionHandler(
  context: AuthContext,
  service: AuthService,
) {
  try {
    const user = await service.requireSession(readSessionToken(context.req.raw))
    return noStore(context.json(success({ user })))
  } catch (error) {
    return authenticationFailure(context, error)
  }
}

function authenticationFailure(context: AuthContext, error: unknown) {
  if (error instanceof AuthenticationError) {
    if (error.status === 429) {
      context.header('Retry-After', '900')
    }
    return noStore(
      context.json(failure(error.code, error.publicMessage), error.status),
    )
  }
  throw error
}

async function readCredentials(
  request: Request,
): Promise<{ email: string; password: string }> {
  let input: unknown
  try {
    input = await request.json()
  } catch {
    throw new AuthenticationError('invalid_request', 400, 'Invalid request.')
  }

  if (
    typeof input !== 'object' ||
    input === null ||
    !('email' in input) ||
    !('password' in input) ||
    typeof input.email !== 'string' ||
    typeof input.password !== 'string'
  ) {
    throw new AuthenticationError('invalid_request', 400, 'Invalid request.')
  }
  return { email: input.email, password: input.password }
}

function readSessionToken(request: Request): string | undefined {
  return readCookie(
    request.headers.get('Cookie') ?? undefined,
    SESSION_COOKIE_NAME,
  )
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function constantTimeTextEqual(left: string, right: string): boolean {
  const leftBytes = new TextEncoder().encode(left)
  const rightBytes = new TextEncoder().encode(right)
  if (leftBytes.byteLength !== rightBytes.byteLength) {
    return false
  }

  let difference = 0
  for (let index = 0; index < leftBytes.byteLength; index += 1) {
    difference |= leftBytes[index]! ^ rightBytes[index]!
  }
  return difference === 0
}
