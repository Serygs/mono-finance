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

export async function cacheOfflineData<T>(
  resource: string,
  value: T,
): Promise<void> {
  const database = await getDatabase()
  const key = await hashResource(resource)
  const encryptionKey = await getEncryptionKey(database)
  const encrypted = await encryptValue(value, encryptionKey)
  const transaction = database.transaction(CACHE_STORE, 'readwrite')
  transaction.objectStore(CACHE_STORE).put({
    cachedAt: Date.now(),
    ciphertext: encrypted.ciphertext,
    initializationVector: encrypted.initializationVector,
    key,
  } satisfies EncryptedRecord)
  await transactionComplete(transaction)
}

export async function readOfflineData<T>(
  resource: string,
): Promise<OfflineCacheEntry<T> | null> {
  const database = await getDatabase()
  const key = await hashResource(resource)
  const transaction = database.transaction(CACHE_STORE, 'readonly')
  const record = await requestResult<EncryptedRecord | undefined>(
    transaction.objectStore(CACHE_STORE).get(key),
  )
  await transactionComplete(transaction)
  if (record === undefined) return null

  const encryptionKey = await getEncryptionKey(database)
  return {
    cachedAt: record.cachedAt,
    value: await decryptValue<T>(record, encryptionKey),
  }
}

export async function clearOfflineCache(): Promise<void> {
  const database = await databasePromise
  database?.close()
  databasePromise = null
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Offline cache is still open.'))
    request.onsuccess = () => resolve()
  })
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
  databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onerror = () => reject(request.error)
    request.onupgradeneeded = () => {
      const database = request.result
      database.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      database.createObjectStore(KEY_STORE)
    }
    request.onsuccess = () => resolve(request.result)
  })
  return databasePromise
}

async function getEncryptionKey(database: IDBDatabase): Promise<CryptoKey> {
  const transaction = database.transaction(KEY_STORE, 'readwrite')
  const store = transaction.objectStore(KEY_STORE)
  const existing = await requestResult<CryptoKey | undefined>(
    store.get(ENCRYPTION_KEY_ID),
  )
  if (existing !== undefined) {
    await transactionComplete(transaction)
    return existing
  }
  const generated = await crypto.subtle.generateKey(
    { length: 256, name: 'AES-GCM' },
    false,
    ['decrypt', 'encrypt'],
  )
  store.put(generated, ENCRYPTION_KEY_ID)
  await transactionComplete(transaction)
  return generated
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

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error)
    transaction.onerror = () => reject(transaction.error)
    transaction.oncomplete = () => resolve()
  })
}
