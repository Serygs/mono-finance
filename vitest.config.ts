import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      thresholds: {
        branches: 60,
        functions: 62,
        lines: 67,
        statements: 65,
      },
    },
    include: [
      'worker/**/*.test.ts',
      'migrations/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
})
