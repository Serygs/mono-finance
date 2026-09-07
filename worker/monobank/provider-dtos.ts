/** Provider transport contracts. Keep these types inside the Monobank boundary. */
export interface ProviderAccount {
  id: string
  sendId?: string
  balance: number
  creditLimit: number
  type: string
  currencyCode: number
  cashbackType?: string
  maskedPan?: string[]
  iban?: string
}

export interface ProviderJar {
  id: string
  sendId?: string
  title: string
  description: string
  currencyCode: number
  balance: number
  goal: number
}

export interface ProviderManagedAccount {
  id: string
  balance: number
  creditLimit: number
  type: string
  currencyCode: number
  iban?: string
}

export interface ProviderManagedClient {
  clientId: string
  tin: number
  name: string
  accounts: ProviderManagedAccount[]
}

export interface ProviderClientInfo {
  clientId: string
  name: string
  webHookUrl?: string
  permissions?: string
  accounts: ProviderAccount[]
  jars?: ProviderJar[]
  managedClients?: ProviderManagedClient[]
}

export interface ProviderStatementItem {
  id: string
  time: number
  description: string
  mcc: number
  originalMcc: number
  hold: boolean
  amount: number
  operationAmount: number
  currencyCode: number
  commissionRate: number
  cashbackAmount: number
  balance: number
  comment?: string
  receiptId?: string
  invoiceId?: string
  counterEdrpou?: string
  counterIban?: string
  counterName?: string
}
