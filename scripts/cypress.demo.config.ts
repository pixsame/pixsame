/**
 * Cypress config used only by record-batch-demo.mjs. It runs the e2e specs of
 * examples/next (the project root stays there) with the plugin taken from the
 * built workspace package, so the example itself stays a plain end-user setup.
 */
import { defineConfig } from 'cypress';
import { initPlugin } from '../packages/cypress-plugin-visual-regression-diff/dist/plugins';

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
    baseUrl: 'http://localhost:3000',
  },
});
