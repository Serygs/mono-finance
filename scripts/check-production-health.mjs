const healthUrl = process.env.PRODUCTION_HEALTH_URL

if (healthUrl === undefined) {
  throw new Error(
    'PRODUCTION_HEALTH_URL is required for the production health check.',
  )
}

const url = new URL(healthUrl)

if (url.protocol !== 'https:') {
  throw new Error('PRODUCTION_HEALTH_URL must use HTTPS.')
}

const response = await fetch(url, {
  headers: { Accept: 'application/json' },
  redirect: 'error',
  signal: AbortSignal.timeout(10_000),
})

if (!response.ok) {
  throw new Error(
    `Production health check failed with HTTP ${response.status}.`,
  )
}

const payload = await response.json()

if (payload?.data?.status !== 'ok') {
  throw new Error(
    'Production health check returned an invalid response contract.',
  )
}
