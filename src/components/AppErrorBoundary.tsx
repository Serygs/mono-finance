import { Component, type ReactNode } from 'react'

import { Button } from './ui/Controls'
import { Alert } from './ui/Feedback'
import { LanguageSwitcher } from '../features/localization/LanguageSwitcher'
import { useLocalization } from '../features/localization/localization'

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  override render() {
    return this.state.failed ? <ApplicationRecovery /> : this.props.children
  }
}

function ApplicationRecovery() {
  const { t } = useLocalization()
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="recovery-title">
        <LanguageSwitcher />
        <h1 id="recovery-title">{t('Unable to display the application.')}</h1>
        <div className="login-form">
          <Alert tone="danger">
            {t(
              'Reload the application to try again. Your saved financial data is unchanged.',
            )}
          </Alert>
          <Button onClick={() => window.location.reload()}>
            {t('Reload application')}
          </Button>
        </div>
      </section>
    </main>
  )
}
