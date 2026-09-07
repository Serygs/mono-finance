export interface AccountSourceRecord {
  providerAccountId: string
  providerSendId?: string
  accountType: string
  currencyNumericCode: string
  balanceMinor: number
  creditLimitMinor: number
  cashbackType?: string
  maskedPans: string[]
  iban?: string
}

export interface ClientAccountSnapshot {
  providerClientId: string
  displayName: string
  permissions?: string
  accounts: AccountSourceRecord[]
}

export interface TransactionSourceRecord {
  providerTransactionId: string
  occurredAtEpochSeconds: number
  description: string
  mcc: number
  originalMcc: number
  isHold: boolean
  accountAmountMinor: number
  operationAmountMinor: number
  operationCurrencyNumericCode: string
  commissionMinor: number
  cashbackMinor: number
  balanceAfterMinor: number
  direction: 'income' | 'expense'
  comment?: string
  receiptId?: string
  invoiceId?: string
  counterpartyTaxId?: string
  counterpartyIban?: string
  counterpartyName?: string
}
