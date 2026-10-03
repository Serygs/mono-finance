import { Icon } from './Icon'

export interface ActiveCriterion {
  key: string
  label: string
  removeLabel: string
  onRemove(): void
}

export function FilterChips({
  criteria,
  label,
}: {
  criteria: ActiveCriterion[]
  label: string
}) {
  return criteria.length === 0 ? null : (
    <ul className="ui-filter-chips" aria-label={label}>
      {criteria.map((criterion) => (
        <li key={criterion.key}>
          <span>{criterion.label}</span>
          <button
            type="button"
            aria-label={criterion.removeLabel}
            onClick={criterion.onRemove}
          >
            <Icon name="close" />
          </button>
        </li>
      ))}
    </ul>
  )
}
