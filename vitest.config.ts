import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // Deployment scripts and composition-only factories are exercised by their
      // consumers; keep coverage focused on product behavior.
      exclude: [
        'scripts/**',
        'src/components/ui/**',
        'worker/**/*-factory.ts',
        'worker/**/factory.ts',
      ],
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
      'scripts/**/*.test.mjs',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
})
