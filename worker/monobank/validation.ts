import { malformedMonobankResponse } from './errors'
import type {
  ProviderAccount,
  ProviderClientInfo,
  ProviderStatementItem,
} from './provider-dtos'

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw malformedMonobankResponse()
  }
  return value as UnknownRecord
}

function requiredString(record: UnknownRecord, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') {
    throw malformedMonobankResponse()
  }
  return value
}

function requiredNonEmptyString(record: UnknownRecord, key: string): string {
  const value = requiredString(record, key)
  if (value.length === 0) {
    throw malformedMonobankResponse()
  }
  return value
}

function optionalString(
  record: UnknownRecord,
  key: string,
): string | undefined {
  const value = record[key]
  if (value === undefined) {
    return undefined
  }
  if (typeof value !== 'string') {
    throw malformedMonobankResponse()
  }
  return value
}

function requiredInteger(record: UnknownRecord, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
    throw malformedMonobankResponse()
  }
  return value
}

function requiredBoolean(record: UnknownRecord, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw malformedMonobankResponse()
  }
  return value
}

function requiredArray(record: UnknownRecord, key: string): unknown[] {
  const value = record[key]
  if (!Array.isArray(value)) {
    throw malformedMonobankResponse()
  }
  return value
}

function optionalStringArray(record: UnknownRecord, key: string): string[] {
  const value = record[key]
  if (value === undefined) {
    return []
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw malformedMonobankResponse()
  }
  return value as string[]
}

function parseAccount(value: unknown): ProviderAccount {
  const account = asRecord(value)
  const currencyCode = requiredInteger(account, 'currencyCode')
  if (currencyCode < 0 || currencyCode > 999) {
    throw malformedMonobankResponse()
  }

  const sendId = optionalString(account, 'sendId')
  const cashbackType = optionalString(account, 'cashbackType')
  const iban = optionalString(account, 'iban')

  return {
    id: requiredNonEmptyString(account, 'id'),
    ...(sendId === undefined ? {} : { sendId }),
    balance: requiredInteger(account, 'balance'),
    creditLimit: requiredInteger(account, 'creditLimit'),
    type: requiredNonEmptyString(account, 'type'),
    currencyCode,
    ...(cashbackType === undefined ? {} : { cashbackType }),
    maskedPan: optionalStringArray(account, 'maskedPan'),
    ...(iban === undefined ? {} : { iban }),
  }
}

export function parseProviderClientInfo(value: unknown): ProviderClientInfo {
  const client = asRecord(value)
  const webHookUrl = optionalString(client, 'webHookUrl')
  const permissions = optionalString(client, 'permissions')

  return {
    clientId: requiredNonEmptyString(client, 'clientId'),
    name: requiredString(client, 'name'),
    ...(webHookUrl === undefined ? {} : { webHookUrl }),
    ...(permissions === undefined ? {} : { permissions }),
    accounts: requiredArray(client, 'accounts').map(parseAccount),
  }
}

function parseStatementItem(value: unknown): ProviderStatementItem {
  const item = asRecord(value)
  const currencyCode = requiredInteger(item, 'currencyCode')
  if (currencyCode < 0 || currencyCode > 999) {
    throw malformedMonobankResponse()
  }

  const comment = optionalString(item, 'comment')
  const receiptId = optionalString(item, 'receiptId')
  const invoiceId = optionalString(item, 'invoiceId')
  const counterEdrpou = optionalString(item, 'counterEdrpou')
  const counterIban = optionalString(item, 'counterIban')
  const counterName = optionalString(item, 'counterName')

  return {
    id: requiredNonEmptyString(item, 'id'),
    time: requiredInteger(item, 'time'),
    description: requiredString(item, 'description'),
    mcc: requiredInteger(item, 'mcc'),
    originalMcc: requiredInteger(item, 'originalMcc'),
    hold: requiredBoolean(item, 'hold'),
    amount: requiredInteger(item, 'amount'),
    operationAmount: requiredInteger(item, 'operationAmount'),
    currencyCode,
    commissionRate: requiredInteger(item, 'commissionRate'),
    cashbackAmount: requiredInteger(item, 'cashbackAmount'),
    balance: requiredInteger(item, 'balance'),
    ...(comment === undefined ? {} : { comment }),
    ...(receiptId === undefined ? {} : { receiptId }),
    ...(invoiceId === undefined ? {} : { invoiceId }),
    ...(counterEdrpou === undefined ? {} : { counterEdrpou }),
    ...(counterIban === undefined ? {} : { counterIban }),
    ...(counterName === undefined ? {} : { counterName }),
  }
}

export function parseProviderStatement(
  value: unknown,
): ProviderStatementItem[] {
  if (!Array.isArray(value)) {
    throw malformedMonobankResponse()
  }
  return value.map(parseStatementItem)
}
