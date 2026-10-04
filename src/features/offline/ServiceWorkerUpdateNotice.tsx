import { useSyncExternalStore } from 'react'
import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import { serviceWorkerUpdates } from './service-worker-updates'

export function ServiceWorkerUpdateNotice() {
  const { t } = useLocalization()
  const { status, editing, online } = useSyncExternalStore(
    serviceWorkerUpdates.subscribe,
    serviceWorkerUpdates.getSnapshot,
    serviceWorkerUpdates.getSnapshot,
  )
  if (status === 'current') return null
  const busy = status === 'waiting' || status === 'activating'
  return (
    <Alert className="service-worker-update" title={t('App update available')}>
      <p id="app-update-help">
        {t(
          editing
            ? 'Finish or cancel editing before updating.'
            : !online
              ? 'Connect to the internet before updating the app.'
              : status === 'waiting'
                ? 'Waiting for pending changes to finish before updating.'
                : status === 'activating'
                  ? 'Updating the app…'
                  : status === 'failed'
                    ? 'The update could not be activated. Try again.'
                    : 'A new version is ready. Update when you are ready to reload.',
        )}
      </p>
      <Button
        aria-describedby="app-update-help"
        disabled={editing || !online}
        loading={busy}
        onClick={serviceWorkerUpdates.requestUpdate}
        type="button"
        variant="secondary"
      >
        {t('Update and reload')}
      </Button>
    </Alert>
  )
}
