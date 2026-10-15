import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type {
  CompensationDetails,
  TransactionListItem,
} from './transaction-types'
import {
  canDropCompensation,
  compensationDropAmount,
  NothingToLinkError,
  useCompensationDrop,
  type CompensationDropResult,
} from './use-compensation-drop'

const { mutations, client, api } = vi.hoisted(() => ({
  mutations: [] as Array<{ mutationFn: (input: never) => Promise<unknown> }>,
  client: {
    fetchQuery: vi.fn(),
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    setQueryData: vi.fn(),
  },
  api: {
    getCompensationDetails: vi.fn(),
    linkCompensation: vi.fn(),
    unlinkCompensation: vi.fn(),
  },
}))
vi.mock('@tanstack/react-query', () => ({
  useMutation: (options: (typeof mutations)[number]) => {
    mutations.push(options)
    return {
      data: undefined,
      error: null,
      isPending: false,
      mutate: vi.fn(),
      reset: vi.fn(),
    }
  },
  useQueryClient: () => client,
}))
vi.mock('./transactions-api', () => api)

function transaction(
  overrides: Partial<TransactionListItem>,
): TransactionListItem {
  return {
    account: { id: 'account-1', maskedPan: null, type: 'black' },
    adjustmentNote: null,
    category: { id: null, name: null, source: null },
    currencyCode: 'UAH',
    currencyMinorUnit: 2,
    effectiveAmountMinor: -100_000,
    exclusionReason: null,
    hasAdjustment: false,
    hasCompensation: false,
    id: 'expense-1',
    isExcluded: false,
    originalAmountMinor: -100_000,
    originalCategory: { id: null, name: null },
    originalDescription: 'Restaurant',
    originalMcc: 5812,
    originalTimestamp: 1_800_000_000,
    ...overrides,
  }
}

const expense = transaction({})
const income = transaction({
  effectiveAmountMinor: 25_500,
  id: 'income-1',
  originalAmountMinor: 25_500,
  originalDescription: 'From: Synthetic Friend',
})

function details(
  remainingPersonalExpenseMinor: number,
  links: CompensationDetails['links'] = [],
): CompensationDetails {
  return {
    links,
    suggestions: [],
    summary: {
      compensatedAmountMinor: 0,
      currencyCode: 'UAH',
      originalExpenseAmountMinor: -100_000,
      remainingPersonalExpenseMinor,
    },
  }
}

function captureMutations() {
  function Probe(): ReactNode {
    useCompensationDrop()
    return null
  }
  renderToStaticMarkup(<Probe />)
  const [link, undo] = mutations
  return {
    link: link!.mutationFn as unknown as (input: {
      expense: TransactionListItem
      income: TransactionListItem
    }) => Promise<CompensationDropResult>,
    undo: undo!.mutationFn as unknown as (
      result: CompensationDropResult,
    ) => Promise<void>,
  }
}

beforeEach(() => {
  mutations.length = 0
  vi.clearAllMocks()
})

describe('compensation drag and drop', () => {
  it('accepts only same-currency incoming transactions dropped on expenses', () => {
    expect(canDropCompensation(income, expense)).toBe(true)
    expect(canDropCompensation(null, expense)).toBe(false)
    expect(canDropCompensation(expense, income)).toBe(false)
    expect(canDropCompensation(income, income)).toBe(false)
    expect(
      canDropCompensation(income, transaction({ currencyCode: 'USD' })),
    ).toBe(false)
  })

  it('caps the linked amount by the remaining personal expense', () => {
    expect(compensationDropAmount(income, details(-100_000))).toBe(25_500)
    expect(compensationDropAmount(income, details(-10_000))).toBe(10_000)
    expect(compensationDropAmount(income, details(0))).toBeNull()
    expect(
      compensationDropAmount(
        income,
        details(-50_000, [
          {
            compensatedAmountMinor: 25_500,
            compensationTransactionId: 'income-1',
            description: 'From: Synthetic Friend',
            id: 'link-1',
            originalTimestamp: 1_800_000_100,
          },
        ]),
      ),
    ).toBeNull()
  })

  it('links immediately with the capped amount and returns the created link for undo', async () => {
    client.fetchQuery.mockResolvedValue(details(-10_000))
    api.linkCompensation.mockResolvedValue(
      details(0, [
        {
          compensatedAmountMinor: 10_000,
          compensationTransactionId: 'income-1',
          description: 'From: Synthetic Friend',
          id: 'link-9',
          originalTimestamp: 1_800_000_100,
        },
      ]),
    )
    const { link } = captureMutations()
    await expect(link({ expense, income })).resolves.toEqual({
      amountMinor: 10_000,
      expense,
      income,
      linkId: 'link-9',
    })
    expect(api.linkCompensation).toHaveBeenCalledWith('expense-1', {
      compensatedAmountMinor: 10_000,
      compensationTransactionId: 'income-1',
    })
    expect(client.setQueryData).toHaveBeenCalledWith(
      ['compensations', 'expense-1'],
      expect.objectContaining({ links: expect.any(Array) }),
    )
  })

  it('does not call the API when nothing remains to compensate', async () => {
    client.fetchQuery.mockResolvedValue(details(0))
    const { link } = captureMutations()
    await expect(link({ expense, income })).rejects.toBeInstanceOf(
      NothingToLinkError,
    )
    expect(api.linkCompensation).not.toHaveBeenCalled()
  })

  it('undoes by unlinking the created link', async () => {
    api.unlinkCompensation.mockResolvedValue(details(-100_000))
    const { undo } = captureMutations()
    await undo({ amountMinor: 10_000, expense, income, linkId: 'link-9' })
    expect(api.unlinkCompensation).toHaveBeenCalledWith('expense-1', 'link-9')
  })
})
