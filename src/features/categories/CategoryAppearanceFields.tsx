import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { CATEGORY_COLORS, CATEGORY_ICONS } from './category-appearance'

const DEFAULT_ICON = CATEGORY_ICONS[0].token
const DEFAULT_COLOR = CATEGORY_COLORS[0].token

interface CategoryAppearanceFieldsProps {
  colorToken: string | null
  icon: string | null
  translate(message: string): string
}

export function CategoryAppearanceFields({
  colorToken,
  icon,
  translate,
}: CategoryAppearanceFieldsProps) {
  const selectedIcon = includesToken(CATEGORY_ICONS, icon) ? icon : DEFAULT_ICON
  const selectedColor = includesToken(CATEGORY_COLORS, colorToken)
    ? colorToken
    : DEFAULT_COLOR

  return (
    <div className="category-appearance-fields">
      <fieldset className="category-choice-field">
        <legend>{translate('Icon')}</legend>
        <div
          aria-label={translate('Choose a category icon')}
          className="category-icon-options"
          role="radiogroup"
        >
          {CATEGORY_ICONS.map((option) => (
            <label className="category-icon-option" key={option.token}>
              <input
                defaultChecked={option.token === selectedIcon}
                name="icon"
                type="radio"
                value={option.token}
              />
              <span className="category-icon-option__visual">
                <CategoryIcon token={option.token} />
                <span>{translate(option.label)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="category-choice-field">
        <legend>{translate('Color')}</legend>
        <div
          aria-label={translate('Choose a category color')}
          className="category-color-options"
          role="radiogroup"
        >
          {CATEGORY_COLORS.map((option) => (
            <label
              className={`category-color-option category-color-option--${option.token}`}
              key={option.token}
            >
              <input
                defaultChecked={option.token === selectedColor}
                name="colorToken"
                type="radio"
                value={option.token}
              />
              <span title={translate(option.label)}>
                <span className="sr-only">{translate(option.label)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

function includesToken(
  options: readonly { token: string }[],
  token: string | null,
): token is string {
  return token !== null && options.some((option) => option.token === token)
}
