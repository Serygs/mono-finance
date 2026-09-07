import { describe, expect, it } from 'vitest'

import { mapProviderClientInfo, mapProviderStatement } from './mappers'
import type { ProviderClientInfo, ProviderStatementItem } from './provider-dtos'

describe('Monobank provider mapping', () => {
  it('maps client accounts into internal source records without transport-only fields', () => {
    const providerClient: ProviderClientInfo = {
      clientId: 'client-1',
      name: 'Іван Мазепа',
      webHookUrl: 'https://example.test/monobank-hook',
      permissions: 'psfj',
      accounts: [
        {
          id: 'account-1',
          sendId: 'send-1',
          balance: 1_234_567,
          creditLimit: 100_000,
          type: 'black',
          currencyCode: 980,
          cashbackType: 'UAH',
          maskedPan: ['537541******1234'],
          iban: 'UA733220010000026201234567890',
        },
      ],
    }

    expect(mapProviderClientInfo(providerClient)).toEqual({
      providerClientId: 'client-1',
      displayName: 'Іван Мазепа',
      permissions: 'psfj',
      accounts: [
        {
          providerAccountId: 'account-1',
          providerSendId: 'send-1',
          accountType: 'black',
          currencyNumericCode: '980',
          balanceMinor: 1_234_567,
          creditLimitMinor: 100_000,
          cashbackType: 'UAH',
          maskedPans: ['537541******1234'],
          iban: 'UA733220010000026201234567890',
        },
      ],
    })
  })

  it('preserves account and operation amounts when mapping a statement item', () => {
    const providerItem: ProviderStatementItem = {
      id: 'transaction-1',
      time: 1_554_466_347,
      description: 'Покупка щастя',
      mcc: 7997,
      originalMcc: 7999,
      hold: false,
      amount: -95_000,
      operationAmount: -2_500,
      currencyCode: 840,
      commissionRate: 0,
      cashbackAmount: 1_900,
      balance: 10_050_000,
      comment: 'За каву',
      receiptId: 'receipt-1',
      invoiceId: 'invoice-1',
      counterEdrpou: '3096889974',
      counterIban: 'UA898999980000355639201001404',
      counterName: 'ТОВ ВОРОНА',
    }

    expect(mapProviderStatement([providerItem])).toEqual([
      {
        providerTransactionId: 'transaction-1',
        occurredAtEpochSeconds: 1_554_466_347,
        description: 'Покупка щастя',
        mcc: 7997,
        originalMcc: 7999,
        isHold: false,
        accountAmountMinor: -95_000,
        operationAmountMinor: -2_500,
        operationCurrencyNumericCode: '840',
        commissionMinor: 0,
        cashbackMinor: 1_900,
        balanceAfterMinor: 10_050_000,
        direction: 'expense',
        comment: 'За каву',
        receiptId: 'receipt-1',
        invoiceId: 'invoice-1',
        counterpartyTaxId: '3096889974',
        counterpartyIban: 'UA898999980000355639201001404',
        counterpartyName: 'ТОВ ВОРОНА',
      },
    ])
  })

  it('maps zero and positive account amounts as income', () => {
    const baseItem: ProviderStatementItem = {
      id: 'transaction-1',
      time: 1_554_466_347,
      description: 'Поповнення',
      mcc: 4829,
      originalMcc: 4829,
      hold: false,
      amount: 0,
      operationAmount: 0,
      currencyCode: 980,
      commissionRate: 0,
      cashbackAmount: 0,
      balance: 10_050_000,
    }

    expect(mapProviderStatement([baseItem])[0]?.direction).toBe('income')
    expect(
      mapProviderStatement([
        { ...baseItem, id: 'transaction-2', amount: 10_000 },
      ])[0]?.direction,
    ).toBe('income')
  })
})
