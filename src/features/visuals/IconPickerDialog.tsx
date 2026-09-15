import { useRef, useState } from 'react'
import { Button } from '../../components/ui/Controls'
import { Dialog } from '../../components/ui/Overlay'
import { CategoryIcon } from '../../components/ui/CategoryIcon'
import { useLocalization } from '../localization/localization'
import { uploadVisual } from './visuals-api'
import { CATEGORY_ICONS } from '../categories/category-appearance'

export function IconPickerDialog({
  assetType,
  onClose,
  onSelect,
  open,
}: {
  assetType: 'merchant-icon' | 'category-icon'
  onClose(): void
  onSelect(assetId: string): void
  open: boolean
}) {
  const { t } = useLocalization()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function selectFile(file: File | undefined) {
    if (!file) return
    if (file.type !== 'image/svg+xml' || file.size > 64 * 1024) {
      setError(t('SVG only, maximum 64 KB.'))
      return
    }
    setPending(true)
    setError(null)
    try {
      onSelect((await uploadVisual(assetType, file)).id)
    } catch {
      setError(t('The SVG could not be accepted.'))
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog onClose={onClose} open={open} title={t('Change icon')}>
      <div className="icon-picker">
        <p>{t('SVG only, maximum 64 KB.')}</p>
        <input
          accept="image/svg+xml,.svg"
          hidden
          onChange={(event) => void selectFile(event.target.files?.[0])}
          ref={input}
          type="file"
        />
        <Button
          disabled={pending}
          onClick={() => input.current?.click()}
          type="button"
        >
          {t(pending ? 'Uploading…' : 'Upload SVG')}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
        <div className="icon-picker__builtins">
          {CATEGORY_ICONS.map((icon) => (
            <button
              aria-label={icon.label}
              key={icon.token}
              onClick={() => onClose()}
              type="button"
            >
              <CategoryIcon token={icon.token} />
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
