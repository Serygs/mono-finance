import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { useAuth } from './auth-context'

export function LoginPage() {
  const { login, status } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (status === 'authenticated') {
    return <Navigate replace to={returnPath(location.state)} />
  }

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
    } catch {
      setError('The email or password is not recognised.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-brand">Mono Finance</p>
        <h1 id="login-title">Your finances, kept private.</h1>
        <p className="login-copy">
          Sign in to access your personal financial workspace.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            autoComplete="username"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <label htmlFor="password">Password</label>
          <input
            autoComplete="current-password"
            id="password"
            minLength={12}
            name="password"
            required
            type="password"
          />
          {error === null ? null : (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
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
