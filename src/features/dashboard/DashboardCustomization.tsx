import { Button } from '../../components/ui/Controls'
import { Dialog } from '../../components/ui/Overlay'
import { FormField, Select } from '../../components/ui/FormControls'
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
  return (
    <Dialog open onClose={onClose} title={t('Customize dashboard')}>
      <FormField label={t('Recent transaction count')}>
        <Select
          value={preferences.recentTransactionsLimit}
          onChange={(event) =>
            onChange({
              ...preferences,
              recentTransactionsLimit: Number(event.target.value) as
                5 | 10 | 20,
            })
          }
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
        </Select>
      </FormField>
      <div className="dashboard-widget-toggles">
        {DASHBOARD_WIDGET_IDS.map((id) => (
          <label key={id}>
            <input
              checked={preferences.enabledWidgetIds.includes(id)}
              onChange={() =>
                onChange({
                  ...preferences,
                  enabledWidgetIds: preferences.enabledWidgetIds.includes(id)
                    ? preferences.enabledWidgetIds.filter((item) => item !== id)
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
          onClick={() => onChange(restoreDefaultDashboardWidgets(preferences))}
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
    </Dialog>
  )
}
