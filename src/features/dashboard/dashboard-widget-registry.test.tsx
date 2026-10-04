import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ENGLISH_MESSAGES, type TranslationKey } from '../localization/messages'
import type { TransactionListItem } from '../transactions/transaction-types'
import type { DashboardAnalytics } from './dashboard-data'
import {
  buildDashboardWidgets,
  type DashboardEvidenceData,
} from './dashboard-widget-registry'

const conversion = {
  baseCurrencyCode: null,
  missingRateTransactionCounts: [],
  mode: 'original' as const,
}
const chart: DashboardAnalytics = {
  breakdowns: {
    expensesByAccount: [],
    expensesByCategory: [],
    expensesByCurrency: [],
    fixedVariableExpenses: [],
    incomeByCategory: [],
    largestTransactions: [],
    recurringExpenses: [],
    spendingByWeekday: [],
    topMerchants: [],
    currencyConversion: conversion,
  },
  overview: {
    averageExpensePerDay: [],
    comparison: [],
    compensation: [],
    excludedTotals: [],
    projectedMonthExpenses: [],
    totals: [],
    currencyConversion: conversion,
  },
  trends: {
    daily: [],
    monthly: [],
    spendingTrend: [],
    currencyConversion: conversion,
  },
}
const emptyState = {
  error: false,
  loading: false,
  transactions: [],
  onRetry: () => undefined,
}

function widgets(
  analytics = chart,
  evidence: DashboardEvidenceData = {
    corrections: emptyState,
    compensations: emptyState,
  },
) {
  return buildDashboardWidgets(
    (key: TranslationKey) => ENGLISH_MESSAGES[key],
    analytics,
    new Map([['UAH', 2]]),
    'UAH',
    { all: [], initial: [] },
    false,
    () => undefined,
    evidence,
    'en',
    [],
  )
}

describe('dashboard widget evidence wiring', () => {
  it('renders top merchant expense magnitudes without income styling', () => {
    const widget = widgets({
      ...chart,
      breakdowns: {
        ...chart.breakdowns,
        topMerchants: [
          {
            amountMinor: 4000,
            currencyCode: 'UAH',
            description: 'Merchant',
            transactionCount: 2,
          },
        ],
      },
    }).find((item) => item.id === 'top-merchants')!
    const markup = renderToStaticMarkup(widget.content)
    expect(markup).toContain('−UAH\u00a040.00')
    expect(markup).toContain('<small>Expenses</small>')
    expect(markup).not.toContain('is-income')
  })

  it('retains API direction for both expense and income magnitudes in largest transactions', () => {
    const widget = widgets({
      ...chart,
      breakdowns: {
        ...chart.breakdowns,
        largestTransactions: ['expense', 'income'].map((direction) => ({
          amountMinor: 4000,
          currencyCode: 'UAH',
          description: direction,
          direction: direction as 'expense' | 'income',
          timestamp: 150,
          transactionId: direction,
        })),
      },
    }).find((item) => item.id === 'largest-transactions')!
    const markup = renderToStaticMarkup(widget.content)
    expect(markup).toContain('−UAH\u00a040.00')
    expect(markup).toContain('+UAH\u00a040.00')
    expect(markup.match(/is-income/g)).toHaveLength(1)
    expect(markup).toContain('<small>Expenses</small>')
    expect(markup).toContain('<small>Income</small>')
  })

  it('renders the dedicated correction and compensation results with their own states', () => {
    const transaction: TransactionListItem = {
      account: { id: 'account-1', maskedPan: null, type: 'black' },
      adjustmentNote: null,
      category: { id: null, name: null, source: null },
      originalCategory: { id: null, name: null },
      currencyCode: 'UAH',
      currencyMinorUnit: 2,
      effectiveAmountMinor: 0,
      exclusionReason: null,
      hasAdjustment: true,
      hasCompensation: false,
      id: 'old-correction',
      isExcluded: false,
      originalAmountMinor: -4000,
      originalDescription: 'Old corrected expense',
      originalMcc: null,
      originalTimestamp: 150,
    }
    const list = widgets(chart, {
      corrections: { ...emptyState, transactions: [transaction] },
      compensations: { ...emptyState, error: true },
    })
    const correction = renderToStaticMarkup(
      list.find((item) => item.id === 'recent-corrections')!.content,
    )
    expect(correction).toContain('Old corrected expense')
    expect(correction).toContain('<small>Expenses</small>')
    expect(correction).not.toContain('is-income')
    const compensation = renderToStaticMarkup(
      list.find((item) => item.id === 'recent-compensations')!.content,
    )
    expect(compensation).toContain('Transactions could not be loaded')
    expect(compensation).not.toContain('No compensation links in this period.')
  })
})
