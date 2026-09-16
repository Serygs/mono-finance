export function getVisibleCategoryLegend<T extends { key: string }>(
  values: T[],
  selectedKey: string | null,
) {
  const top = values.slice(0, 5)
  const selected = values.find((item) => item.key === selectedKey)
  return selected !== undefined &&
    !top.some((item) => item.key === selected.key)
    ? top.concat(selected)
    : top
}
