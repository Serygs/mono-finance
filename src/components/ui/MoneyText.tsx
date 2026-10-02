import { Fragment } from 'react'

/** Allow exact formatted amounts to wrap at locale grouping boundaries. */
export function MoneyText({
  value,
  locale,
}: {
  value: string
  locale: string
}) {
  const group = new Intl.NumberFormat(locale)
    .formatToParts(1000)
    .find((part) => part.type === 'group')?.value
  const segments = group === undefined ? [value] : value.split(group)
  return segments.map((segment, index) => (
    <Fragment key={index}>
      {index === 0 ? null : (
        <>
          {group}
          <wbr />
        </>
      )}
      {segment}
    </Fragment>
  ))
}
