import { typescript, typescriptOverrides } from '@frsource/eslint-config';
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt()
  .prepend(...typescript, { ignores: ['.output', '.nuxt', '.data', 'test-results', 'playwright-report'] })
  .append(...typescriptOverrides, {
    rules: {
      // single-word page/component names are fine here (index, error, ProsePre)
      'vue/multi-word-component-names': 'off',
      'vue/require-default-prop': 'off',
      // Nuxt Content / i18n render raw HTML on purpose in none of our templates
      'vue/no-v-html': 'error',
    },
  });
