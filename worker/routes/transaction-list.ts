import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import type {
  TransactionDirection,
  TransactionListInput,
  TransactionQueryService,
} from '../services/transaction-query-service'

type TransactionListContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 100

export async function listTransactionsHandler(
  context: TransactionListContext,
  service: TransactionQueryService,
) {
  const filters = parseFilters(
    context.req.queries(),
    context.get('authenticatedUser').id,
  )
  if (filters === null) {
    return noStore(
      context.json(
        failure('validation_error', 'Invalid transaction filters.'),
        400,
      ),
    )
  }
  return noStore(context.json(success(await service.list(filters))))
}

function parseFilters(
  query: Record<string, string[]>,
  userId: string,
): TransactionListInput | null {
  const accountIds = toArray(query['accountId'])
  const direction = nullableDirection(query['direction'])
  const excluded = nullableBoolean(query['excluded'])
  const dateFrom = nullableEpoch(query['dateFrom'])
  const dateTo = nullableEpoch(query['dateTo'])
  const limit = nullablePositiveInteger(query['limit']) ?? DEFAULT_PAGE_SIZE
  const currency = nullableCurrency(query['currency'])
  const category = nullableText(query['category'], 120)
  const cursor = nullableText(query['cursor'], 512)
  const search = nullableText(query['search'], 100)
  if (
    accountIds === null ||
    direction === undefined ||
    excluded === undefined ||
    dateFrom === undefined ||
    dateTo === undefined ||
    limit > MAX_PAGE_SIZE ||
    currency === undefined ||
    category === undefined ||
    cursor === undefined ||
    (cursor !== null && !isCursor(cursor)) ||
    search === undefined ||
    (dateFrom !== null && dateTo !== null && dateFrom > dateTo)
  ) {
    return null
  }
  return {
    accountIds,
    category,
    cursor,
    currency,
    dateFrom,
    dateTo,
    direction,
    excluded,
    limit,
    search,
    userId,
  }
}

function toArray(value: string | string[] | undefined): string[] | null {
  const values =
    value === undefined ? [] : Array.isArray(value) ? value : [value]
  if (
    values.length > 20 ||
    values.some((item) => item.length === 0 || item.length > 128)
  ) {
    return null
  }
  return [...new Set(values)]
}

function nullableDirection(
  value: string | string[] | undefined,
): TransactionDirection | null | undefined {
  if (value === undefined) return null
  const singleValue = single(value)
  if (singleValue === undefined) return undefined
  return singleValue === 'income' || singleValue === 'expense'
    ? singleValue
    : undefined
}

function nullableBoolean(
  value: string | string[] | undefined,
): boolean | null | undefined {
  if (value === undefined) return null
  const singleValue = single(value)
  if (singleValue === undefined) return undefined
  if (singleValue === 'true') return true
  if (singleValue === 'false') return false
  return undefined
}

function nullableEpoch(
  value: string | string[] | undefined,
): number | null | undefined {
  if (value === undefined) return null
  const singleValue = single(value)
  if (singleValue === undefined || !/^\d+$/.test(singleValue)) return undefined
  const epoch = Number(singleValue)
  return Number.isSafeInteger(epoch) ? epoch : undefined
}

function nullablePositiveInteger(
  value: string | string[] | undefined,
): number | null {
  if (value === undefined) return null
  const singleValue = single(value)
  if (singleValue === undefined || !/^\d+$/.test(singleValue))
    return Number.MAX_SAFE_INTEGER
  const number = Number(singleValue)
  return Number.isSafeInteger(number) && number > 0
    ? number
    : Number.MAX_SAFE_INTEGER
}

function nullableCurrency(
  value: string | string[] | undefined,
): string | null | undefined {
  if (value === undefined) return null
  const singleValue = single(value)
  if (singleValue === undefined || !/^[A-Za-z]{3}$/.test(singleValue))
    return undefined
  return singleValue.toUpperCase()
}

function nullableText(
  value: string | string[] | undefined,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return null
  const singleValue = single(value)
  if (
    singleValue === undefined ||
    singleValue.length === 0 ||
    singleValue.length > maxLength
  )
    return undefined
  return singleValue.trim() || undefined
}

function single(value: string | string[]): string | undefined {
  return typeof value === 'string'
    ? value
    : value.length === 1
      ? value[0]
      : undefined
}

function isCursor(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(atob(value))
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { id?: unknown }).id === 'string' &&
      Number.isSafeInteger((parsed as { timestamp?: unknown }).timestamp)
    )
  } catch {
    return false
  }
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}
