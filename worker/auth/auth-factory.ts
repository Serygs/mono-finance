import { D1AuthRepository } from '../repositories/auth-repository'
import type { AuthEnvironment } from '../common/environment'
import { AuthService } from './auth-service'
import { HmacSessionTokenService, WebCryptoPasswordHasher } from './crypto'

export function createAuthService(environment: AuthEnvironment): AuthService {
  return new AuthService(
    new D1AuthRepository(environment.DB),
    new WebCryptoPasswordHasher(),
    new HmacSessionTokenService(environment.SESSION_TOKEN_PEPPER),
    { now: () => Math.floor(Date.now() / 1000) },
  )
}
