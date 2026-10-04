import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { Button } from '../../components/ui/Controls'
import { Alert } from '../../components/ui/Feedback'
import { FormField } from '../../components/ui/FormControls'
import { LanguageSwitcher } from '../localization/LanguageSwitcher'
import {
  useLocalization,
  type TranslationKey,
} from '../localization/localization'
import { useAuth } from './auth-context'
import { authenticationErrorKey } from './auth-api'
import { SessionRecovery } from './SessionRecovery'
import { SessionCleanupNotice } from './SessionCleanupNotice'

export function LoginPage() {
  const { login, status, cleanupFailed } = useAuth()
  const { t } = useLocalization()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const emailInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<TranslationKey | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate replace to={returnPath(location.state)} />
  }
  if (status === 'loading' || status === 'unavailable')
    return <SessionRecovery />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = form.get('password')
    if (typeof password !== 'string') {
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      await login(email, password)
      navigate(returnPath(location.state), { replace: true })
    } catch (error) {
      const message = authenticationErrorKey(error)
      setError(message)
      if (message === 'The email or password is not recognised.')
        emailInput.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-card__topline">
          <p className="login-brand">{t('Mono Finance')}</p>
          <LanguageSwitcher />
        </div>
        <h1 id="login-title">{t('Your finances, kept private.')}</h1>
        <p className="login-copy">
          {t('Sign in to access your personal financial workspace.')}
        </p>
        <SessionCleanupNotice />
        <form className="login-form" onSubmit={handleSubmit}>
          <FormField label={t('Email')}>
            <input
              autoComplete="username"
              id="email"
              ref={emailInput}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              spellCheck={false}
              type="email"
              value={email}
              aria-invalid={
                error === 'The email or password is not recognised.' ||
                undefined
              }
              aria-describedby={error === null ? undefined : 'login-error'}
            />
          </FormField>
          <FormField label={t('Password')}>
            <input
              autoComplete="current-password"
              id="password"
              minLength={12}
              name="password"
              required
              type="password"
              aria-invalid={
                error === 'The email or password is not recognised.' ||
                undefined
              }
              aria-describedby={error === null ? undefined : 'login-error'}
            />
          </FormField>
          {error === null ? null : (
            <div id="login-error">
              <Alert tone="danger">{t(error)}</Alert>
            </div>
          )}
          <Button
            disabled={cleanupFailed}
            loading={isSubmitting}
            size="large"
            type="submit"
          >
            {isSubmitting ? t('Signing in…') : t('Sign in')}
          </Button>
        </form>
      </section>
    </main>
  )
}

function returnPath(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('/') &&
    !state.from.startsWith('//')
  ) {
    return state.from
  }
  return '/'
}
