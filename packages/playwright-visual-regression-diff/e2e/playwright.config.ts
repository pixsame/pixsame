import { defineConfig } from '@playwright/test';

/** Smoke test against a locally installed Chromium: `pnpm test:smoke`. */
export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: 'test-results',
  retries: 1,
  reporter: [['list']],
  use: {
    browserName: 'chromium',
    viewport: { width: 640, height: 400 },
    visualRegression: { maxDiffThreshold: 0.001 },
  },
});
