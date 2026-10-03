import { defineConfig, devices } from '@playwright/test'
import { availableParallelism } from 'node:os'

export default defineConfig({
  fullyParallel: true,
  // CI shards have separate runners; keep each runner's browser load bounded.
  workers: process.env.CI
    ? 2
    : Math.max(1, Math.min(4, Math.floor(availableParallelism() / 2))),
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // This suite mocks APIs and loads Vite modules directly; PWA shell caching
    // must not intercept navigation or reuse development assets between loads.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    env: {
      APP_ENV: 'development',
      MONOBANK_TOKEN: 'e2e-placeholder-token',
      SESSION_TOKEN_PEPPER: 'e2e-session-pepper',
      SETUP_TOKEN: 'e2e-setup-token',
    },
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
