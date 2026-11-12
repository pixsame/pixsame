import { defineConfig, devices } from '@playwright/test';

// Tests run against the generated static site, exactly what gets deployed.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173' },
  // CI uses the Chrome preinstalled on ubuntu-latest: `playwright install --with-deps` took ~6.5 min
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(process.env.CI ? { channel: 'chrome' } : {}),
      },
    },
  ],
  webServer: {
    command: 'node scripts/serve-static.mjs',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    // pnpm >= 12.6 runs scripts in their own process group: ask for a graceful stop
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5000 },
  },
});
