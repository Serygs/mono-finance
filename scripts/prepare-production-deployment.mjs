import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const databaseIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const requiredSecrets = [
  'MONOBANK_TOKEN',
  'SESSION_TOKEN_PEPPER',
  'SETUP_TOKEN',
]

export function prepareProductionDeploymentConfig(databaseId, buildConfig) {
  if (!databaseIdPattern.test(databaseId)) {
    throw new Error('CLOUDFLARE_D1_DATABASE_ID must be a D1 database UUID.')
  }

  if (buildConfig.vars?.APP_ENV !== 'production') {
    throw new Error(
      'The Worker build must use the production Cloudflare environment.',
    )
  }

  return {
    ...buildConfig,
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'mono-finance-production',
        database_id: databaseId,
        migrations_dir: '../../migrations',
      },
    ],
    secrets: {
      required: requiredSecrets,
    },
  }
}

export function writeProductionDeploymentConfig({
  databaseId,
  inputPath,
  outputPath,
}) {
  const buildConfig = JSON.parse(readFileSync(inputPath, 'utf8'))
  const deploymentConfig = prepareProductionDeploymentConfig(
    databaseId,
    buildConfig,
  )

  writeFileSync(outputPath, `${JSON.stringify(deploymentConfig, null, 2)}\n`)
}

function isEntrypoint() {
  return process.argv[1] === fileURLToPath(import.meta.url)
}

if (isEntrypoint()) {
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID

  if (databaseId === undefined) {
    throw new Error(
      'CLOUDFLARE_D1_DATABASE_ID is required for a production deployment.',
    )
  }

  const rootDirectory = resolve(fileURLToPath(new URL('..', import.meta.url)))
  writeProductionDeploymentConfig({
    databaseId,
    inputPath: resolve(rootDirectory, 'dist/mono_finance/wrangler.json'),
    outputPath: resolve(
      rootDirectory,
      'dist/mono_finance/wrangler.production.json',
    ),
  })
}
