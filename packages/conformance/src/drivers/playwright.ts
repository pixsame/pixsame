import fs from 'node:fs';
import path from 'node:path';
import { createWorkspace, SHOT_TITLE } from '../workspace.js';
import type { Driver } from '../types.js';
import { runAndObserve } from './run.js';

const CONFIG = `import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'conformance.spec.mjs',
  outputDir: 'test-results',
  retries: 0,
  reporter: [['line']],
  use: {
    browserName: 'chromium',
    viewport: { width: 640, height: 400 },
    baseURL: process.env.CONFORMANCE_BASE_URL,
  },
});
`;

export const playwrightDriver: Driver = {
  name: 'playwright',
  async create(baseUrl) {
    const ws = createWorkspace('playwright', baseUrl);
    fs.writeFileSync(path.join(ws.dir, 'playwright.config.mjs'), CONFIG);
    return ws;
  },
  async run(ws, { fixture, options, imagesPath }) {
    // Cypress captures the full page by default, Playwright only the viewport
    const matchOptions = {
      title: SHOT_TITLE,
      screenshotConfig: { fullPage: true },
      ...options,
      imagesPath,
    };
    fs.writeFileSync(
      path.join(ws.dir, 'conformance.spec.mjs'),
      `import { test } from '@pixsame/playwright';

test('shot', async ({ page, matchImage }) => {
  await page.goto('/?v=${fixture}');
  await matchImage(page, ${JSON.stringify(matchOptions)});
});
`,
    );
    fs.rmSync(path.join(ws.dir, 'test-results'), {
      recursive: true,
      force: true,
    });
    return runAndObserve(
      ws,
      ['playwright', 'test', '-c', path.join(ws.dir, 'playwright.config.mjs')],
      { CONFORMANCE_BASE_URL: ws.baseUrl },
      `${process.platform}-chromium`,
    );
  },
};
