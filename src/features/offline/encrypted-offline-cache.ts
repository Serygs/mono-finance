import { assertPrivateSession, privateSession } from '../auth/private-session'

const DATABASE_NAME = 'mono-finance-offline-v1'
const DATABASE_VERSION = 1
const CACHE_STORE = 'encrypted-records'
const KEY_STORE = 'keys'
const ENCRYPTION_KEY_ID = 'offline-cache-key'

interface EncryptedRecord {
  cachedAt: number
  ciphertext: ArrayBuffer
  initializationVector: ArrayBuffer
  key: string
}

export interface OfflineCacheEntry<T> {
  cachedAt: number
  value: T
}

let databasePromise: Promise<IDBDatabase> | null = null
let openDatabase: IDBDatabase | null = null
let cacheGeneration = 0
let deletionPromise: Promise<void> | null = null

export class OfflineCacheCleanupError extends Error {
  readonly reason: 'blocked' | 'unavailable'
  constructor(reason: 'blocked' | 'unavailable') {
    super('Offline cache cleanup requires recovery.')
    this.reason = reason
  }
}

export async function cacheOfflineData<T>(
  resource: string,
  value: T,
): Promise<void> {
  const session = privateSession()
  const database = await getDatabase()
  const key = await hashResource(resource)
  const encryptionKey = await getEncryptionKey(database)
  const encrypted = await encryptValue(value, encryptionKey)
  assertPrivateSession(session.generation)
  const transaction = database.transaction(CACHE_STORE, 'readwrite')
  const completed = transactionComplete(transaction, session.signal)
  transaction.objectStore(CACHE_STORE).put({
    cachedAt: Date.now(),
    ciphertext: encrypted.ciphertext,
    initializationVector: encrypted.initializationVector,
    key,
  } satisfies EncryptedRecord)
  await completed
  assertPrivateSession(session.generation)
}

export async function readOfflineData<T>(
  resource: string,
): Promise<OfflineCacheEntry<T> | null> {
  const session = privateSession()
  const database = await getDatabase()
  const key = await hashResource(resource)
  assertPrivateSession(session.generation)
  const transaction = database.transaction(CACHE_STORE, 'readonly')
  const completed = transactionComplete(transaction, session.signal)
  const [record] = await Promise.all([
    requestResult<EncryptedRecord | undefined>(
      transaction.objectStore(CACHE_STORE).get(key),
    ),
    completed,
  ])
  assertPrivateSession(session.generation)
  if (record === undefined) return null

  const encryptionKey = await getEncryptionKey(database)
  const value = await decryptValue<T>(record, encryptionKey)
  assertPrivateSession(session.generation)
  return {
    cachedAt: record.cachedAt,
    value,
  }
}

export async function clearOfflineCache(): Promise<void> {
  if (deletionPromise !== null) return deletionPromise
  cacheGeneration++
  openDatabase?.close()
  openDatabase = null
  databasePromise = null
  // No IndexedDB means no cache was available to this browsing context.
  if (typeof indexedDB === 'undefined') return
  let blocked = false
  deletionPromise = new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onerror = () => {
      deletionPromise = null
      reject(new OfflineCacheCleanupError('unavailable'))
    }
    request.onblocked = () => {
      blocked = true
      // The deletion request remains queued. Do not reopen the database behind it.
      reject(new OfflineCacheCleanupError('blocked'))
    }
    request.onsuccess = () => {
      deletionPromise = null
      resolve()
    }
  })
  try {
    await deletionPromise
  } catch (error) {
    if (!blocked) deletionPromise = null
    throw error instanceof OfflineCacheCleanupError
      ? error
      : new OfflineCacheCleanupError('unavailable')
  }
}

export async function encryptValue<T>(
  value: T,
  encryptionKey: CryptoKey,
): Promise<Pick<EncryptedRecord, 'ciphertext' | 'initializationVector'>> {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12))
  const plaintext = new TextEncoder().encode(JSON.stringify(value))
  const ciphertext = await crypto.subtle.encrypt(
    {
      additionalData: new TextEncoder().encode(DATABASE_NAME),
      iv: initializationVector,
      name: 'AES-GCM',
    },
    encryptionKey,
    plaintext,
  )
  return {
    ciphertext,
    initializationVector: initializationVector.buffer.slice(0),
  }
}

export async function decryptValue<T>(
  encrypted: Pick<EncryptedRecord, 'ciphertext' | 'initializationVector'>,
  encryptionKey: CryptoKey,
): Promise<T> {
  const plaintext = await crypto.subtle.decrypt(
    {
      additionalData: new TextEncoder().encode(DATABASE_NAME),
      iv: encrypted.initializationVector,
      name: 'AES-GCM',
    },
    encryptionKey,
    encrypted.ciphertext,
  )
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

async function getDatabase(): Promise<IDBDatabase> {
  if (deletionPromise !== null) throw new OfflineCacheCleanupError('blocked')
  const generation = cacheGeneration
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onerror = () => {
      databasePromise = null
      reject(request.error)
    }
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      database.createObjectStore(KEY_STORE)
    }
    request.onsuccess = () => {
      const database = request.result
      if (generation !== cacheGeneration) {
        database.close()
        reject(new OfflineCacheCleanupError('unavailable'))
        return
      }
      openDatabase = database
      database.onversionchange = () => {
        database.close()
        if (openDatabase === database) {
          openDatabase = null
          databasePromise = null
          cacheGeneration++
        }
      }
      resolve(database)
    }
  })
  const pending = databasePromise
  try {
    return await pending
  } catch (error) {
    if (databasePromise === pending) databasePromise = null
    throw error
  }
}

async function getEncryptionKey(database: IDBDatabase): Promise<CryptoKey> {
  const session = privateSession()
  const transaction = database.transaction(KEY_STORE, 'readonly')
  const completed = transactionComplete(transaction, session.signal)
  const store = transaction.objectStore(KEY_STORE)
  const [existing] = await Promise.all([
    requestResult<CryptoKey | undefined>(store.get(ENCRYPTION_KEY_ID)),
    completed,
  ])
  assertPrivateSession(session.generation)
  if (existing !== undefined) {
    return existing
  }
  const generated = await crypto.subtle.generateKey(
    { length: 256, name: 'AES-GCM' },
    false,
    ['decrypt', 'encrypt'],
  )
  assertPrivateSession(session.generation)
  // Generate outside a transaction: IndexedDB may auto-commit while Web Crypto runs.
  const writeTransaction = database.transaction(KEY_STORE, 'readwrite')
  const written = transactionComplete(writeTransaction, session.signal)
  const writeStore = writeTransaction.objectStore(KEY_STORE)
  const [key] = await Promise.all([
    requestResult<CryptoKey | undefined>(
      writeStore.get(ENCRYPTION_KEY_ID),
    ).then((concurrentKey) => {
      if (concurrentKey === undefined)
        writeStore.put(generated, ENCRYPTION_KEY_ID)
      return concurrentKey ?? generated
    }),
    written,
  ])
  assertPrivateSession(session.generation)
  return key
}

async function hashResource(resource: string): Promise<string> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${DATABASE_NAME}:${resource}`),
  )
  return Array.from(new Uint8Array(hash), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
  })
}

function transactionComplete(
  transaction: IDBTransaction,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const abort = () => {
      try {
        transaction.abort()
      } catch {
        /* A completed transaction cannot be aborted. */
      }
    }
    const cleanup = () => signal.removeEventListener('abort', abort)
    signal.addEventListener('abort', abort, { once: true })
    transaction.onabort = transaction.onerror = () => {
      cleanup()
      reject(transaction.error ?? new Error('Offline cache transaction ended.'))
    }
    transaction.oncomplete = () => {
      cleanup()
      resolve()
    }
  })
}
