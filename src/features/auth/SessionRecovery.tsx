import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { LanguageSwitcher } from '../localization/LanguageSwitcher'
import { useLocalization } from '../localization/localization'
import { useAuth } from './auth-context'

export function SessionRecovery() {
  const { status, verificationError, retrySession } = useAuth()
  const { t } = useLocalization()
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="session-title">
        <LanguageSwitcher />
        <h1 id="session-title">{t('Your finances, kept private.')}</h1>
        <div className="login-form">
          {verificationError === null ? (
            <p role="status">{t('Checking your secure session…')}</p>
          ) : (
            <>
              <Alert tone="danger">{t(verificationError)}</Alert>
              <Button
                onClick={() => void retrySession()}
                loading={status === 'loading'}
              >
                {t('Retry session verification')}
              </Button>
            </>
          )}
        </div>
      </section>
    </main>
  )
}
