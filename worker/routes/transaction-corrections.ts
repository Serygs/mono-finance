import type { Context } from 'hono'

import type { AuthenticatedUser } from '../auth/auth-service'
import { failure, success } from '../common/api-response'
import type { MonobankEnvironment } from '../common/environment'
import {
  TransactionCorrectionError,
  type TransactionCorrectionService,
} from '../services/transaction-correction-service'

type TransactionCorrectionContext = Context<{
  Bindings: MonobankEnvironment
  Variables: { authenticatedUser: AuthenticatedUser }
}>

export async function saveAdjustmentHandler(
  context: TransactionCorrectionContext,
  service: TransactionCorrectionService,
) {
  try {
    const input = await readAdjustment(context.req.raw)
    const correction = await service.saveAdjustment(
      context.get('authenticatedUser').id,
      transactionId(context),
      input,
    )
    return noStore(context.json(success({ correction })))
  } catch (error) {
    return correctionFailure(context, error)
  }
}

export async function resetAdjustmentHandler(
  context: TransactionCorrectionContext,
  service: TransactionCorrectionService,
) {
  try {
    const correction = await service.resetAdjustment(
      context.get('authenticatedUser').id,
      transactionId(context),
    )
    return noStore(context.json(success({ correction })))
  } catch (error) {
    return correctionFailure(context, error)
  }
}

export async function excludeTransactionHandler(
  context: TransactionCorrectionContext,
  service: TransactionCorrectionService,
) {
  try {
    const correction = await service.exclude(
      context.get('authenticatedUser').id,
      transactionId(context),
      await readReason(context.req.raw),
    )
    return noStore(context.json(success({ correction })))
  } catch (error) {
    return correctionFailure(context, error)
  }
}

export async function restoreTransactionHandler(
  context: TransactionCorrectionContext,
  service: TransactionCorrectionService,
) {
  try {
    const correction = await service.restore(
      context.get('authenticatedUser').id,
      transactionId(context),
    )
    return noStore(context.json(success({ correction })))
  } catch (error) {
    return correctionFailure(context, error)
  }
}

async function readAdjustment(request: Request) {
  const input = await readJsonObject(request)
  const adjustedAmountMinor = input['adjustedAmountMinor']
  const note = normalizeOptionalText(input['note'], 1_000)
  if (
    typeof adjustedAmountMinor !== 'number' ||
    !Number.isSafeInteger(adjustedAmountMinor) ||
    note === undefined
  ) {
    throw new TransactionCorrectionError('invalid_correction')
  }
  return { adjustedAmountMinor, note }
}

async function readReason(request: Request): Promise<string | null> {
  const input = await readJsonObject(request)
  const reason = normalizeOptionalText(input['reason'], 1_000)
  if (reason === undefined)
    throw new TransactionCorrectionError('invalid_correction')
  return reason
}

async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  try {
    const input: unknown = await request.json()
    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new TransactionCorrectionError('invalid_correction')
    }
    return input as Record<string, unknown>
  } catch (error) {
    if (error instanceof TransactionCorrectionError) throw error
    throw new TransactionCorrectionError('invalid_correction')
  }
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined || value === null) return null
  if (typeof value !== 'string' || value.length > maxLength) return undefined
  return value.trim() || null
}

function correctionFailure(
  context: TransactionCorrectionContext,
  error: unknown,
): Response {
  if (error instanceof TransactionCorrectionError) {
    if (error.code === 'transaction_not_found') {
      return noStore(
        context.json(failure('not_found', 'Transaction was not found.'), 404),
      )
    }
    return noStore(
      context.json(
        failure('validation_error', 'Invalid transaction correction.'),
        400,
      ),
    )
  }
  throw error
}

function noStore(response: Response): Response {
  response.headers.set('Cache-Control', 'no-store')
  return response
}

function transactionId(context: TransactionCorrectionContext): string {
  const value = context.req.param('transactionId')
  if (value === undefined || value.length === 0 || value.length > 128) {
    throw new TransactionCorrectionError('invalid_correction')
  }
  return value
}
