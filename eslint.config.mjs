import { typescript, javascript } from '@frsource/eslint-config';
import globals from 'globals';
import cypress from 'eslint-plugin-cypress'

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...javascript,
  ...typescript,
  // apps/* have their own eslint config (Vue/Nuxt) and lint step
  { ignores: ['**/dist', '**/coverage', '**/node_modules', '**/.nuxt', '**/.output', 'apps/**'] },
  { rules: { '@typescript-eslint/no-invalid-void-type': 'off' } },
  {
    plugins: { cypress },
    files: ['examples/*/cypress/**', 'packages/*/src/**'],
    languageOptions: {
      globals: {
        ...globals.es2021,
        ...globals.node,
        ...cypress.configs.globals.languageOptions.globals,
      },
    },
  },
];
