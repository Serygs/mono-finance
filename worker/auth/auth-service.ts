export const LOGIN_LOCK_SECONDS = 15 * 60
export const LOGIN_MAX_ATTEMPTS = 5
export const LOGIN_WINDOW_SECONDS = 15 * 60
export const SESSION_TTL_SECONDS = 8 * 60 * 60

const DUMMY_PASSWORD_HASH =
  'pbkdf2-sha256$600000$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

export interface AuthenticatedUser {
  email: string
  id: string
}

interface UserRecord extends AuthenticatedUser {
  passwordHash: string
}

interface SessionRecord {
  expiresAt: number
  id: string
  revokedAt: number | null
  userId: string
}

interface LoginAttemptRecord {
  failedAttempts: number
  lockedUntil: number | null
  windowStartedAt: number
}

export interface AuthRepository {
  clearLoginAttempts(identifierHash: string): Promise<void>
  countUsers(): Promise<number>
  createOwner(user: UserRecord): Promise<boolean>
  createSession(session: {
    expiresAt: number
    id: string
    tokenHash: string
    userId: string
  }): Promise<void>
  findLoginAttempt(identifierHash: string): Promise<LoginAttemptRecord | null>
  findSessionByTokenHash(tokenHash: string): Promise<SessionRecord | null>
  findUserByEmail(email: string): Promise<UserRecord | null>
  findUserById(id: string): Promise<AuthenticatedUser | null>
  recordFailedLogin(
    identifierHash: string,
    now: number,
    windowSeconds: number,
    maxAttempts: number,
    lockSeconds: number,
  ): Promise<void>
  revokeSession(tokenHash: string, revokedAt: number): Promise<void>
}

export interface Clock {
  now(): number
}

export interface PasswordHasher {
  hash(password: string): Promise<string>
  verify(password: string, passwordHash: string): Promise<boolean>
}

export interface SessionTokenService {
  generate(): string
  hash(token: string): Promise<string>
}

export class AuthenticationError extends Error {
  readonly code:
    | 'invalid_credentials'
    | 'invalid_request'
    | 'setup_unavailable'
    | 'too_many_requests'
    | 'unauthenticated'
  readonly publicMessage: string
  readonly status: 400 | 401 | 409 | 429

  constructor(
    code:
      | 'invalid_credentials'
      | 'invalid_request'
      | 'setup_unavailable'
      | 'too_many_requests'
      | 'unauthenticated',
    status: 400 | 401 | 409 | 429,
    publicMessage: string,
  ) {
    super(publicMessage)
    this.code = code
    this.status = status
    this.publicMessage = publicMessage
  }
}

export class AuthService {
  private readonly clock: Clock
  private readonly passwordHasher: PasswordHasher
  private readonly repository: AuthRepository
  private readonly sessionTokens: SessionTokenService

  constructor(
    repository: AuthRepository,
    passwordHasher: PasswordHasher,
    sessionTokens: SessionTokenService,
    clock: Clock,
  ) {
    this.repository = repository
    this.passwordHasher = passwordHasher
    this.sessionTokens = sessionTokens
    this.clock = clock
  }

  async createOwner(
    emailInput: string,
    password: string,
  ): Promise<AuthenticatedUser> {
    const email = validateEmail(emailInput)
    validatePassword(password)

    if ((await this.repository.countUsers()) > 0) {
      throw new AuthenticationError(
        'setup_unavailable',
        409,
        'Initial setup is unavailable.',
      )
    }

    const user: UserRecord = {
      email,
      id: crypto.randomUUID(),
      passwordHash: await this.passwordHasher.hash(password),
    }
    const created = await this.repository.createOwner(user)
    if (!created) {
      throw new AuthenticationError(
        'setup_unavailable',
        409,
        'Initial setup is unavailable.',
      )
    }
    return { email: user.email, id: user.id }
  }

  async login(emailInput: string, password: string, clientIdentifier: string) {
    const email = validateEmail(emailInput)
    validatePassword(password)
    const now = this.clock.now()
    const identifierHash = await this.sessionTokens.hash(
      `login:${clientIdentifier}:${email}`,
    )
    const attempt = await this.repository.findLoginAttempt(identifierHash)

    if (
      attempt !== null &&
      attempt.lockedUntil !== null &&
      attempt.lockedUntil > now
    ) {
      throw new AuthenticationError(
        'too_many_requests',
        429,
        'Too many login attempts. Try again later.',
      )
    }

    const user = await this.repository.findUserByEmail(email)
    const passwordMatches = await this.passwordHasher.verify(
      password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    )

    if (user === null || !passwordMatches) {
      await this.repository.recordFailedLogin(
        identifierHash,
        now,
        LOGIN_WINDOW_SECONDS,
        LOGIN_MAX_ATTEMPTS,
        LOGIN_LOCK_SECONDS,
      )
      throw new AuthenticationError(
        'invalid_credentials',
        401,
        'Invalid email or password.',
      )
    }

    await this.repository.clearLoginAttempts(identifierHash)
    const token = this.sessionTokens.generate()
    await this.repository.createSession({
      expiresAt: now + SESSION_TTL_SECONDS,
      id: crypto.randomUUID(),
      tokenHash: await this.sessionTokens.hash(token),
      userId: user.id,
    })

    return { token, user: { email: user.email, id: user.id } }
  }

  async requireSession(token: string | undefined): Promise<AuthenticatedUser> {
    if (token === undefined) {
      throw unauthenticated()
    }

    const session = await this.repository.findSessionByTokenHash(
      await this.sessionTokens.hash(token),
    )
    if (
      session === null ||
      session.revokedAt !== null ||
      session.expiresAt <= this.clock.now()
    ) {
      throw unauthenticated()
    }

    const user = await this.repository.findUserById(session.userId)
    if (user === null) {
      throw unauthenticated()
    }

    return user
  }

  async logout(token: string | undefined): Promise<void> {
    if (token === undefined) {
      return
    }

    await this.repository.revokeSession(
      await this.sessionTokens.hash(token),
      this.clock.now(),
    )
  }
}

function validateEmail(emailInput: string): string {
  const email = emailInput.trim().toLowerCase()
  if (
    email.length === 0 ||
    email.length > 320 ||
    !/^\S+@\S+\.\S+$/.test(email)
  ) {
    throw new AuthenticationError('invalid_request', 400, 'Invalid request.')
  }
  return email
}

function validatePassword(password: string): void {
  if (password.length < 12 || password.length > 1024) {
    throw new AuthenticationError('invalid_request', 400, 'Invalid request.')
  }
}

function unauthenticated(): AuthenticationError {
  return new AuthenticationError(
    'unauthenticated',
    401,
    'Authentication is required.',
  )
}
