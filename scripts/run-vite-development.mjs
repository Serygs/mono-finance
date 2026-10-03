import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteEntrypoint = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
)
const wranglerEntrypoint = fileURLToPath(
  new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
)

export function runDevelopment(args = [], spawn = spawnSync) {
  const options = {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, CLOUDFLARE_ENV: 'development' },
    stdio: 'inherit',
  }
  const migrations = spawn(
    process.execPath,
    [
      wranglerEntrypoint,
      'd1',
      'migrations',
      'apply',
      'DB',
      '--env',
      'development',
      '--local',
      '--persist-to',
      '.wrangler/state',
    ],
    options,
  )
  if (migrations.error !== undefined) throw migrations.error
  if (migrations.status !== 0) {
    console.error(
      'Local D1 migration failed; the development server was not started. Run npm run db:migrate:local to diagnose the failure.',
    )
    return migrations.status ?? 1
  }

  const result = spawn(
    process.execPath,
    [viteEntrypoint, '--mode', 'development', ...args],
    options,
  )
  if (result.error !== undefined) throw result.error
  return result.status ?? 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = runDevelopment(process.argv.slice(2))
}
