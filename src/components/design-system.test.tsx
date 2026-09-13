import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Alert, EmptyState, Skeleton } from './ui/Feedback'
import { FormField, MultiSelect, Select } from './ui/FormControls'
import { BottomSheet, Dialog } from './ui/Overlay'
import { PageHeader, PageSurface } from './ui/Page'
import { Button, IconButton, SegmentedControl } from './ui/Controls'
import { AccountChip, CategoryChip, StatusBadge } from './ui/Chips'
import { CompactList, CompactTable } from './ui/Collections'
import { Popover } from './ui/Popover'
import { Card, ChartContainer, KpiCard } from './ui/Surfaces'

describe('design system', () => {
  it('exposes semantic page and surface structure', () => {
    const markup = renderToStaticMarkup(
      <PageSurface>
        <PageHeader eyebrow="Ledger" title="Transactions" />
        <Card title="Activity">Content</Card>
      </PageSurface>,
    )

    expect(markup).toContain('<h1')
    expect(markup).toContain('Transactions')
    expect(markup).toContain('ui-card')
  })

  it('provides accessible controls and labelled fields', () => {
    const markup = renderToStaticMarkup(
      <>
        <Button loading>Save</Button>
        <IconButton label="Close">×</IconButton>
        <SegmentedControl
          label="Direction"
          onChange={() => undefined}
          options={[
            { label: 'All', value: 'all' },
            { label: 'Expenses', value: 'expenses' },
          ]}
          value="all"
        />
        <FormField label="Category" hint="Optional">
          <Select defaultValue="all" name="category">
            <option value="all">All</option>
          </Select>
        </FormField>
        <MultiSelect
          ariaLabel="Accounts"
          onChange={() => undefined}
          options={[{ label: 'UAH account', value: 'uah' }]}
          value={[]}
        />
        <Popover content="Choose one or more accounts" label="Accounts">
          Accounts
        </Popover>
      </>,
    )

    expect(markup).toContain('aria-busy="true"')
    expect(markup).toContain('aria-label="Close"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('<label')
    expect(markup).toContain('Optional')
    expect(markup).toContain('ui-multi-select')
    expect(markup).toContain('ui-popover')
  })

  it('keeps chips and feedback states explicit', () => {
    const markup = renderToStaticMarkup(
      <>
        <AccountChip label="UAH account" selected />
        <CategoryChip color="blue" label="Dining" />
        <StatusBadge label="Active" tone="success" />
        <CompactList label="Recent items">
          <li>Item</li>
        </CompactList>
        <CompactTable>
          <table>
            <tbody>
              <tr>
                <td>Item</td>
              </tr>
            </tbody>
          </table>
        </CompactTable>
        <Alert tone="danger" title="Could not load">
          Try again.
        </Alert>
        <EmptyState title="No transactions">Change the filters.</EmptyState>
        <Skeleton label="Loading dashboard" lines={2} />
      </>,
    )

    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('ui-chip--blue')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('Loading dashboard')
    expect(markup).toContain('ui-status-badge--success')
    expect(markup).toContain('ui-compact-table')
  })

  it('provides financial and chart surfaces with accessible summaries', () => {
    const markup = renderToStaticMarkup(
      <>
        <KpiCard accent="cyan" label="Total spent" value="UAH 1,000" />
        <ChartContainer summary="Spending increased this week" title="Spending">
          chart
        </ChartContainer>
      </>,
    )

    expect(markup).toContain('ui-kpi--cyan')
    expect(markup).toContain('UAH 1,000')
    expect(markup).toContain('Spending increased this week')
  })

  it('renders overlays only while open and labels them', () => {
    const closed = renderToStaticMarkup(
      <BottomSheet onClose={() => undefined} open={false} title="Details">
        content
      </BottomSheet>,
    )
    const open = renderToStaticMarkup(
      <>
        <BottomSheet onClose={() => undefined} open title="Details">
          sheet content
        </BottomSheet>
        <Dialog onClose={() => undefined} open title="Confirm deletion">
          dialog content
        </Dialog>
      </>,
    )

    expect(closed).toBe('')
    expect(open).toContain('aria-modal="true"')
    expect(open).toContain('Details')
    expect(open).toContain('Confirm deletion')
  })
})
