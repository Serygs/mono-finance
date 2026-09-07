import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'worker/**/*.test.ts',
      'migrations/**/*.test.ts',
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
    ],
  },
})
