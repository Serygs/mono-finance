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
    if (
      ![
        'image/svg+xml',
        'image/png',
        'image/jpeg',
        'image/webp',
        'image/gif',
      ].includes(file.type) ||
      file.size > 1_900_000
    ) {
      setError(t('SVG, PNG, JPEG, WebP or GIF; maximum 1.9 MB.'))
      return
    }
    setPending(true)
    setError(null)
    try {
      onSelect((await uploadVisual(assetType, file)).id)
    } catch {
      setError(t('The image could not be accepted.'))
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog onClose={onClose} open={open} title={t('Change icon')}>
      <div className="icon-picker">
        <p>{t('SVG, PNG, JPEG, WebP or GIF; maximum 1.9 MB.')}</p>
        <input
          accept="image/svg+xml,image/png,image/jpeg,image/webp,image/gif,.svg,.png,.jpg,.jpeg,.webp,.gif"
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
          {t(pending ? 'Uploading…' : 'Upload image')}
        </Button>
        {error ? <p role="alert">{error}</p> : null}
        <div aria-label={t('Built-in icons')} className="icon-picker__builtins">
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
