import { defineConfig } from 'vitest/config';

// Every run spawns a real Cypress or Playwright process, so runs are serial
// and generous with time.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
