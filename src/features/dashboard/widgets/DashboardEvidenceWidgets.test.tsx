import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  AmountEvidenceList,
  FixedVariableExpensesWidget,
  RecurringExpensesWidget,
  TransactionEvidenceWidget,
} from './DashboardEvidenceWidgets'

const units = new Map([['UAH', 2]])

describe('dashboard evidence financial direction', () => {
  it.each([4000, -4000])(
    'renders an expense magnitude of %s as an expense without income styling',
    (amountMinor) => {
      const markup = renderToStaticMarkup(
        <AmountEvidenceList
          units={units}
          values={[
            {
              amountMinor,
              currencyCode: 'UAH',
              direction: 'expense',
              label: 'Merchant',
              detail: '2 transactions',
            },
          ]}
        />,
      )
      expect(markup).toContain('−UAH\u00a040.00')
      expect(markup).toContain('<small>Expenses</small>')
      expect(markup).not.toContain('is-income')
    },
  )

  it('uses explicit income direction and a visible label for a positive magnitude', () => {
    const markup = renderToStaticMarkup(
      <AmountEvidenceList
        units={units}
        values={[
          {
            amountMinor: 4000,
            currencyCode: 'UAH',
            direction: 'income',
            label: 'Salary',
            detail: 'January',
          },
        ]}
      />,
    )
    expect(markup).toContain('<b class="is-income">+UAH\u00a040.00')
    expect(markup).toContain('<small>Income</small>')
  })

  it('preserves the expense label for a correction reduced to zero', () => {
    const markup = renderToStaticMarkup(
      <AmountEvidenceList
        units={units}
        values={[
          {
            amountMinor: 0,
            currencyCode: 'UAH',
            direction: 'expense',
            label: 'Merchant',
            detail: 'January',
          },
        ]}
      />,
    )
    expect(markup).toContain('<small>Expenses</small>')
    expect(markup).toContain('UAH\u00a00.00')
    expect(markup).not.toContain('−UAH\u00a00.00')
    expect(markup).not.toContain('is-income')
  })
})

describe('transaction evidence query states', () => {
  it('shows a retryable failure instead of claiming that no matches exist', () => {
    const markup = renderToStaticMarkup(
      <TransactionEvidenceWidget
        empty="No corrected transactions in this period."
        error
        loading={false}
        locale="en"
        onRetry={() => undefined}
        transactions={[]}
        units={units}
      />,
    )
    expect(markup).toContain('Transactions could not be loaded')
    expect(markup).toContain('Retry')
    expect(markup).not.toContain('No corrected transactions')
  })

  it('shows loading before showing a verified empty result', () => {
    const props = {
      empty: 'No corrected transactions in this period.' as const,
      error: false,
      locale: 'en',
      onRetry: () => undefined,
      transactions: [],
      units,
    }
    const loading = renderToStaticMarkup(
      <TransactionEvidenceWidget {...props} loading />,
    )
    expect(loading).toContain('Loading')
    expect(loading).not.toContain('No corrected transactions')
    const empty = renderToStaticMarkup(
      <TransactionEvidenceWidget {...props} loading={false} />,
    )
    expect(empty).toContain('No corrected transactions in this period.')
  })
})

describe('unconfirmed repeat-purchase evidence', () => {
  it.each([
    {
      description: 'Occasional purchases',
      frequencyDays: 180,
      transactionCount: 2,
      averageAmountMinor: 5000,
      lastAmountMinor: 5000,
    },
    {
      description: 'Periodic payments',
      frequencyDays: 30,
      transactionCount: 4,
      averageAmountMinor: 12000,
      lastAmountMinor: 12000,
    },
    {
      description: 'Variable payments',
      frequencyDays: 30,
      transactionCount: 4,
      averageAmountMinor: 13000,
      lastAmountMinor: 15000,
    },
  ])(
    'does not claim that $description establish a recurring obligation',
    (evidence) => {
      const markup = renderToStaticMarkup(
        <RecurringExpensesWidget
          units={units}
          values={[{ ...evidence, currencyCode: 'UAH' }]}
        />,
      )
      expect(markup).toContain(
        'Repeated purchases do not establish recurring or fixed expenses.',
      )
      expect(markup).toContain(
        `Average interval: ${evidence.frequencyDays} days · ${evidence.transactionCount} purchases`,
      )
      expect(markup).not.toContain('About every')
    },
  )

  it('labels the legacy split as repeated purchases and other expenses instead of fixed obligations', () => {
    const markup = renderToStaticMarkup(
      <FixedVariableExpensesWidget
        units={units}
        values={[
          {
            currencyCode: 'UAH',
            fixedExpenseAmountMinor: 12000,
            variableExpenseAmountMinor: 5000,
          },
        ]}
      />,
    )
    expect(markup).toContain(
      'Repeated purchases do not establish recurring or fixed expenses.',
    )
    expect(markup).toContain('Repeated purchases')
    expect(markup).toContain('Other expenses')
    expect(markup).toContain('70.6% of period expenses')
    expect(markup).not.toContain('of category spending')
    expect(markup).not.toContain('Recurring / fixed')
    expect(markup).not.toContain('Variable')
  })
})
