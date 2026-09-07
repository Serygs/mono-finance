import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  fullyParallel: true,
  testDir: './tests/e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4173',
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
