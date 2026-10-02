import type { ReactNode } from 'react'
import { Popover } from './Popover'

export function ChartScale({
  zero,
  maximum,
  label,
}: {
  zero: string
  maximum: string
  label: string
}) {
  return (
    <div className="ui-chart-scale">
      <span>
        {label}: {zero}
      </span>
      <span>{maximum}</span>
    </div>
  )
}

export function ChartPoint({
  children,
  label,
  title,
  details,
}: {
  children: ReactNode
  label: string
  title: string
  details: Array<{ label: string; value: string }>
}) {
  return (
    <span className="ui-chart-mark">
      <span className="ui-chart-mobile-mark" aria-hidden="true">
        {children}
      </span>
      <Popover
        className="ui-chart-point"
        openOnFocusHover
        label={label}
        content={
          <div className="ui-chart-details">
            <strong>{title}</strong>
            <dl>
              {details.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        }
      >
        {children}
      </Popover>
    </span>
  )
}

export function ChartDataTable({
  label,
  rows,
}: {
  label: string
  rows: Array<{
    title: string
    details: Array<{ label: string; value: string }>
  }>
}) {
  return (
    <Popover
      className="ui-chart-data-table"
      mobileSheet
      label={label}
      content={
        <div className="ui-chart-data-rows">
          {rows.map((row) => (
            <div className="ui-chart-details" key={row.title}>
              <strong>{row.title}</strong>
              <dl>
                {row.details.map((item) => (
                  <div key={item.label}>
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      }
    >
      {label}
    </Popover>
  )
}
