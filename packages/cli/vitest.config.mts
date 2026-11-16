import { defineConfig } from 'vitest/config';

const isCI = !!process.env.CI;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: isCI
        ? ['text', ['lcovonly', { projectRoot: '../..' }]]
        : ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/test-utils.ts'],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
});
