import fs from 'node:fs';
import path from 'node:path';
import { createWorkspace, SHOT_TITLE } from '../workspace.js';
import type { Driver } from '../types.js';
import { runAndObserve } from './run.js';

const CONFIG = `import { defineConfig } from 'cypress';
import { initPlugin } from '@pixsame/cypress-plugin-visual-regression-diff/plugins';

// Batch Review Mode (on by default) defers failures to an end-of-spec summary;
// the shared scenarios want the per-image message, so it is off here.
export default defineConfig({
  expose: { pluginVisualRegressionBatchReviewMode: false },
  e2e: {
    baseUrl: process.env.CONFORMANCE_BASE_URL,
    viewportWidth: 640,
    viewportHeight: 400,
    video: false,
    retries: 0,
    specPattern: 'cypress/e2e/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    setupNodeEvents(on, config) {
      initPlugin(on, config);
    },
  },
});
`;

export const cypressDriver: Driver = {
  name: 'cypress',
  async create(baseUrl) {
    const ws = createWorkspace('cypress', baseUrl);
    fs.mkdirSync(path.join(ws.dir, 'cypress/e2e'), { recursive: true });
    fs.mkdirSync(path.join(ws.dir, 'cypress/support'), { recursive: true });
    fs.writeFileSync(path.join(ws.dir, 'cypress.config.mjs'), CONFIG);
    fs.writeFileSync(
      path.join(ws.dir, 'cypress/support/e2e.js'),
      "import '@pixsame/cypress-plugin-visual-regression-diff';\n",
    );
    return ws;
  },
  async run(ws, { fixture, options, imagesPath }) {
    const matchOptions = { title: SHOT_TITLE, ...options, imagesPath };
    fs.writeFileSync(
      path.join(ws.dir, 'cypress/e2e/conformance.cy.js'),
      `describe('conformance', () => {
  it('shot', () => {
    cy.visit('/?v=${fixture}');
    cy.matchImage(${JSON.stringify(matchOptions)});
  });
});
`,
    );
    return runAndObserve(
      ws,
      ['cypress', 'run', '--project', ws.dir, '--browser', 'electron'],
      { CONFORMANCE_BASE_URL: ws.baseUrl },
      `${process.platform}-electron`,
    );
  },
};
