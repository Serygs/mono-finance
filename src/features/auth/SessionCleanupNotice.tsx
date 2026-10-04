import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { useLocalization } from '../localization/localization'
import { useAuth } from './auth-context'

export function SessionCleanupNotice() {
  const { cleanupError, retryCleanup } = useAuth()
  const { t } = useLocalization()
  if (cleanupError === null) return null
  return (
    <Alert tone="danger">
      <p>{t(cleanupError)}</p>
      <Button onClick={() => void retryCleanup()}>
        {t('Retry local cleanup')}
      </Button>
    </Alert>
  )
}
