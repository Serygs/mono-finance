import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteEntrypoint = fileURLToPath(
  new URL('../node_modules/vite/bin/vite.js', import.meta.url),
)
const result = spawnSync(
  process.execPath,
  [viteEntrypoint, 'build', '--mode', 'production'],
  {
    env: { ...process.env, CLOUDFLARE_ENV: 'production' },
    stdio: 'inherit',
  },
)

if (result.error !== undefined) {
  throw result.error
}

process.exitCode = result.status ?? 1
