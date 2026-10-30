import { defineConfig, configDefaults } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
  test: {
    testTimeout: 30_000,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['text', ['lcovonly', { projectRoot: '../..' }]]
        : ['text', 'lcov'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        // needs a Playwright worker / a Docker daemon; covered by the smoke configs in e2e/
        'src/fixture.ts',
        'src/remote.global-setup.ts',
        'src/remote.global-teardown.ts',
        'src/index.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
});
