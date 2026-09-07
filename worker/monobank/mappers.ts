import type {
  AccountSourceRecord,
  ClientAccountSnapshot,
  TransactionSourceRecord,
} from './internal-dtos'
import type {
  ProviderAccount,
  ProviderClientInfo,
  ProviderStatementItem,
} from './provider-dtos'

function currencyNumericCode(value: number): string {
  return value.toString().padStart(3, '0')
}

function mapProviderAccount(account: ProviderAccount): AccountSourceRecord {
  return {
    providerAccountId: account.id,
    ...(account.sendId === undefined ? {} : { providerSendId: account.sendId }),
    accountType: account.type,
    currencyNumericCode: currencyNumericCode(account.currencyCode),
    balanceMinor: account.balance,
    creditLimitMinor: account.creditLimit,
    ...(account.cashbackType === undefined
      ? {}
      : { cashbackType: account.cashbackType }),
    maskedPans: account.maskedPan ?? [],
    ...(account.iban === undefined ? {} : { iban: account.iban }),
  }
}

export function mapProviderClientInfo(
  clientInfo: ProviderClientInfo,
): ClientAccountSnapshot {
  return {
    providerClientId: clientInfo.clientId,
    displayName: clientInfo.name,
    ...(clientInfo.permissions === undefined
      ? {}
      : { permissions: clientInfo.permissions }),
    accounts: clientInfo.accounts.map(mapProviderAccount),
  }
}

function mapProviderStatementItem(
  item: ProviderStatementItem,
): TransactionSourceRecord {
  return {
    providerTransactionId: item.id,
    occurredAtEpochSeconds: item.time,
    description: item.description,
    mcc: item.mcc,
    originalMcc: item.originalMcc,
    isHold: item.hold,
    accountAmountMinor: item.amount,
    operationAmountMinor: item.operationAmount,
    operationCurrencyNumericCode: currencyNumericCode(item.currencyCode),
    commissionMinor: item.commissionRate,
    cashbackMinor: item.cashbackAmount,
    balanceAfterMinor: item.balance,
    direction: item.amount < 0 ? 'expense' : 'income',
    ...(item.comment === undefined ? {} : { comment: item.comment }),
    ...(item.receiptId === undefined ? {} : { receiptId: item.receiptId }),
    ...(item.invoiceId === undefined ? {} : { invoiceId: item.invoiceId }),
    ...(item.counterEdrpou === undefined
      ? {}
      : { counterpartyTaxId: item.counterEdrpou }),
    ...(item.counterIban === undefined
      ? {}
      : { counterpartyIban: item.counterIban }),
    ...(item.counterName === undefined
      ? {}
      : { counterpartyName: item.counterName }),
  }
}

export function mapProviderStatement(
  items: ProviderStatementItem[],
): TransactionSourceRecord[] {
  return items.map(mapProviderStatementItem)
}
