import { useState } from 'react'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { SearchField } from '../../components/ui/FormControls'
import { Popover } from '../../components/ui/Popover'
import { Icon } from '../../components/ui/Icon'
import { useLocalization } from '../localization/localization'
import type { CustomCategory } from './categories-api'
import { resolveCategoryAppearance } from './category-appearance'

/** Category-owned picker; shared native mobile overlay and desktop popover. */
export function CategoryPicker({
  categories,
  selected,
  bankName,
  label,
  onChange,
  pending,
}: {
  categories: CustomCategory[]
  selected: CustomCategory | null
  bankName: string
  label: string
  onChange(id: string): void
  pending: boolean
}) {
  const { t } = useLocalization()
  const [query, setQuery] = useState('')
  const visible = categories.filter((category) =>
    category.name
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  )
  function choose(id: string) {
    setQuery('')
    onChange(id)
  }
  return (
    <Popover
      disabled={pending}
      mobileSheet
      className="category-picker"
      label={label}
      content={
        <div className="category-picker-content">
          <SearchField
            label={t('Search categories')}
            placeholder={t('Search categories…')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div
            className="category-picker-options"
            aria-label={t('Assigned category')}
          >
            <button
              type="button"
              aria-pressed={selected === null}
              data-popover-dismiss
              onClick={() => choose('')}
            >
              <span>
                <strong>{t('Bank category')}</strong>
                <small>{bankName}</small>
              </span>
              {selected === null ? <Icon name="check" /> : null}
            </button>
            {visible.map((category) => {
              const appearance = resolveCategoryAppearance(category)
              return (
                <button
                  type="button"
                  key={category.id}
                  aria-pressed={selected?.id === category.id}
                  data-popover-dismiss
                  onClick={() => choose(category.id)}
                >
                  <span
                    className={`category-visual ui-visual--${appearance.colorToken ?? 'slate'}`}
                  >
                    <CategoryIcon token={appearance.icon ?? 'wallet'} />
                  </span>
                  <span>{category.name}</span>
                  {selected?.id === category.id ? <Icon name="check" /> : null}
                </button>
              )
            })}
            {visible.length === 0 && query !== '' ? (
              <p role="status">{t('No matching categories')}</p>
            ) : null}
          </div>
        </div>
      }
    >
      <span>
        <small>
          {t(selected === null ? 'Bank category' : 'Assigned category')}
        </small>
        <strong>{selected?.name ?? bankName}</strong>
      </span>
      <Icon name="down" />
    </Popover>
  )
}
