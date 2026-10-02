import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
  IncomeExpenseChart,
  SpendingTrendChart,
  WeekdaySpendingChart,
} from './DashboardCharts'

const units = new Map([['UAH', 2]])
const point = {
  currencyCode: 'UAH',
  periodStart: 1_735_689_600,
  expenseAmountMinor: 0,
  incomeAmountMinor: 0,
  netAmountMinor: 0,
}

describe('chart data states', () => {
  it('shows an empty state instead of axes for zero or absent aggregates', () => {
    const zero = renderToStaticMarkup(
      <IncomeExpenseChart currency="UAH" points={[point]} units={units} />,
    )
    expect(zero).toContain('No data in this period.')
    expect(zero).not.toContain('ui-chart-scale')
    const weekdays = renderToStaticMarkup(
      <WeekdaySpendingChart units={units} values={[]} />,
    )
    expect(weekdays).toContain('No expenses in this period.')
  })

  it.each([
    { incomeAmountMinor: 1, expenseAmountMinor: 0, netAmountMinor: 1 },
    { incomeAmountMinor: 0, expenseAmountMinor: -1, netAmountMinor: -1 },
  ])(
    'keeps tiny one-sided income/expense values on a zero-based quantitative scale',
    (amounts) => {
      const markup = renderToStaticMarkup(
        <IncomeExpenseChart
          currency="UAH"
          points={[{ ...point, ...amounts }]}
          units={units}
        />,
      )
      expect(markup).toContain('Scale: UAH\u00a00.00')
      expect(markup).toContain('UAH\u00a00.01')
      expect(markup).toContain('Net cash flow:')
      expect(markup).toContain('height:100.00%')
      expect(markup).toContain('height:0.00%')
    },
  )

  it('renders a useful trend from a single expense instead of discarding the data', () => {
    const markup = renderToStaticMarkup(
      <SpendingTrendChart
        currency="UAH"
        points={[{ ...point, expenseAmountMinor: -1 }]}
        units={units}
      />,
    )
    expect(markup).toContain('UAH\u00a00.01')
    expect(markup).toContain('line-chart')
    expect(markup).not.toContain('Not enough data')
  })
})
