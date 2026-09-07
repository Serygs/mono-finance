import { fileURLToPath } from 'node:url'

export function parseProductionHealthUrl(healthUrl) {
  if (healthUrl === undefined || healthUrl.trim() === '') {
    throw new Error(
      'PRODUCTION_HEALTH_URL is required for the production health check.',
    )
  }

  let url
  try {
    url = new URL(healthUrl)
  } catch {
    throw new Error('PRODUCTION_HEALTH_URL must be a valid HTTPS URL.')
  }

  if (url.protocol !== 'https:') {
    throw new Error('PRODUCTION_HEALTH_URL must use HTTPS.')
  }

  return url
}

export async function checkProductionHealth(healthUrl) {
  const url = parseProductionHealthUrl(healthUrl)
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
}

function isEntrypoint() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isEntrypoint()) {
  await checkProductionHealth(process.env.PRODUCTION_HEALTH_URL)
}
