import { defineConfig } from '@playwright/test';
import { remoteBrowser } from '../src/remote';

/**
 * Smoke test against the browser inside the official Playwright image:
 * `pnpm test:smoke:remote`. Needs a running Docker daemon; the first run
 * pulls ~2 GB. Baselines land in a separate folder so they never mix with
 * the ones the local Chromium produced.
 */
const remote = remoteBrowser({ port: 3131, keepAlive: true });

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  outputDir: 'test-results-remote',
  globalSetup: remote.globalSetup,
  globalTeardown: remote.globalTeardown,
  use: {
    browserName: 'chromium',
    connectOptions: remote.connectOptions,
    viewport: { width: 640, height: 400 },
    visualRegression: {
      maxDiffThreshold: 0.001,
      imagesPath: '{spec_path}/__image_snapshots__/remote-{platform}',
    },
  },
});
