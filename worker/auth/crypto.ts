import type { PasswordHasher, SessionTokenService } from './auth-service'

const PASSWORD_ALGORITHM = 'pbkdf2-sha256'
const PASSWORD_HASH_BYTES = 32
const PASSWORD_ITERATIONS = 600_000
const PASSWORD_SALT_BYTES = 16
const textEncoder = new TextEncoder()

export class WebCryptoPasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(PASSWORD_SALT_BYTES)
    const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS)
    return [
      PASSWORD_ALGORITHM,
      PASSWORD_ITERATIONS,
      encodeBase64Url(salt),
      encodeBase64Url(hash),
    ].join('$')
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const parsed = parsePasswordHash(passwordHash)
    if (parsed === null) {
      return false
    }

    const candidate = await derivePasswordHash(
      password,
      parsed.salt,
      parsed.iterations,
    )
    return timingSafeEqual(candidate, parsed.hash)
  }
}

export class HmacSessionTokenService implements SessionTokenService {
  private readonly keyPromise: Promise<CryptoKey>

  constructor(pepper: string) {
    this.keyPromise = crypto.subtle.importKey(
      'raw',
      textEncoder.encode(pepper),
      { hash: 'SHA-256', name: 'HMAC' },
      false,
      ['sign'],
    )
  }

  generate(): string {
    return encodeBase64Url(randomBytes(32))
  }

  async hash(token: string): Promise<string> {
    const signature = await crypto.subtle.sign(
      'HMAC',
      await this.keyPromise,
      textEncoder.encode(token),
    )
    return encodeBase64Url(new Uint8Array(signature))
  }
}

export function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false
  }

  let difference = 0
  for (let index = 0; index < left.byteLength; index += 1) {
    difference |= left[index]! ^ right[index]!
  }
  return difference === 0
}

function derivePasswordHash(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  return crypto.subtle
    .importKey('raw', textEncoder.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ])
    .then((key) =>
      crypto.subtle.deriveBits(
        { hash: 'SHA-256', iterations, name: 'PBKDF2', salt },
        key,
        PASSWORD_HASH_BYTES * 8,
      ),
    )
    .then((hash) => new Uint8Array(hash))
}

function parsePasswordHash(passwordHash: string): {
  hash: Uint8Array
  iterations: number
  salt: Uint8Array
} | null {
  const [algorithm, iterationInput, saltInput, hashInput, ...unexpected] =
    passwordHash.split('$')
  if (
    algorithm !== PASSWORD_ALGORITHM ||
    iterationInput === undefined ||
    saltInput === undefined ||
    hashInput === undefined ||
    unexpected.length > 0
  ) {
    return null
  }

  const iterations = Number(iterationInput)
  if (!Number.isSafeInteger(iterations) || iterations < PASSWORD_ITERATIONS) {
    return null
  }

  const salt = decodeBase64Url(saltInput)
  const hash = decodeBase64Url(hashInput)
  if (
    salt === null ||
    hash === null ||
    salt.byteLength < PASSWORD_SALT_BYTES ||
    hash.byteLength !== PASSWORD_HASH_BYTES
  ) {
    return null
  }

  return { hash, iterations, salt }
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function encodeBase64Url(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/u, '')
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    return null
  }

  const padded =
    value.replaceAll('-', '+').replaceAll('_', '/') +
    '==='.slice((value.length + 3) % 4)
  try {
    return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}
