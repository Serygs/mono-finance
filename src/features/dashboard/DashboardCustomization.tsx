import { Button } from '../../components/ui/Controls'
import { useModalDialog } from '../../components/ui/use-modal-dialog'
import { useLocalization } from '../localization/localization'
import {
  DASHBOARD_WIDGET_IDS,
  resetDashboardLayout,
  resetDashboardWidgetSizes,
  restoreDefaultDashboardWidgets,
  type DashboardPreferences,
} from './dashboard-preferences'
import { WIDGET_TITLES } from './dashboard-widget-config'

export function DashboardCustomization({
  onChange,
  onClose,
  preferences,
}: {
  onChange(value: DashboardPreferences): void
  onClose(): void
  preferences: DashboardPreferences
}) {
  const { t } = useLocalization()
  const { dialogRef, onCancel, onBackdropClick } = useModalDialog(true, onClose)
  return (
    <dialog
      aria-label={t('Customize dashboard')}
      aria-modal="true"
      className="dashboard-dialog-backdrop"
      ref={dialogRef}
      onCancel={onCancel}
      onClick={onBackdropClick}
    >
      <section className="dashboard-dialog">
        <header>
          <h2>{t('Customize dashboard')}</h2>
          <Button onClick={onClose} size="small" type="button" variant="quiet">
            {t('Close')}
          </Button>
        </header>
        <div className="dashboard-widget-toggles">
          {DASHBOARD_WIDGET_IDS.map((id) => (
            <label key={id}>
              <input
                checked={preferences.enabledWidgetIds.includes(id)}
                onChange={() =>
                  onChange({
                    ...preferences,
                    enabledWidgetIds: preferences.enabledWidgetIds.includes(id)
                      ? preferences.enabledWidgetIds.filter(
                          (item) => item !== id,
                        )
                      : [...preferences.enabledWidgetIds, id],
                  })
                }
                type="checkbox"
              />
              {t(WIDGET_TITLES[id])}
            </label>
          ))}
        </div>
        <div className="dashboard-dialog-actions">
          <Button
            onClick={() =>
              onChange(restoreDefaultDashboardWidgets(preferences))
            }
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Restore default widgets')}
          </Button>
          <Button
            onClick={() => onChange(resetDashboardLayout(preferences))}
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Reset layout')}
          </Button>
          <Button
            onClick={() => onChange(resetDashboardWidgetSizes(preferences))}
            size="small"
            type="button"
            variant="secondary"
          >
            {t('Reset widget sizes')}
          </Button>
        </div>
      </section>
    </dialog>
  )
}
