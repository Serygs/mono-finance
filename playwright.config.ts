import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
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
