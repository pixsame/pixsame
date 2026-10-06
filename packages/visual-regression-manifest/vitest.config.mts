import { defineConfig, configDefaults } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['text', ['lcovonly', { projectRoot: '../..' }]]
        : ['text', 'lcov'],
      exclude: [
        ...(configDefaults.coverage.exclude ?? []),
        'src/types.ts',
        '__tests__/**',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 89,
        statements: 90,
      },
    },
  },
});
