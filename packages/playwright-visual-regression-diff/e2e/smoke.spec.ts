import fs from 'fs';
import path from 'path';
import {
  ANALYSIS_VERSION,
  layoutVersionOf,
  readLayout,
} from '@pixsame/analysis';
import {
  MANIFEST_SPEC_VERSION,
  readManifestFile,
  validateManifest,
} from 'visual-regression-manifest';
import { test, expect } from '../src';
import { manifestFileNameFor } from '../src/manifest.utils';

const html = (accent: string) => `<!doctype html>
<html><head><style>
  body { margin: 0; font: 24px/1.4 Arial, sans-serif; background: #fafafa; color: #222; }
  main { padding: 32px; }
  .card { border: 2px solid ${accent}; border-radius: 12px; padding: 16px; width: 320px; }
  .caret { caret-color: red; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .spinner { width: 24px; height: 24px; border: 4px solid ${accent}; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; }
</style></head>
<body><main>
  <h1>Visual regression</h1>
  <div class="card"><p>Hello, Playwright.</p><div class="spinner"></div></div>
  <input class="caret" value="typed text" autofocus>
</main></body></html>`;

test.describe('matchImage', () => {
  test('creates a baseline on first run and passes on the second', async ({
    page,
    matchImage,
  }) => {
    await page.setContent(html('#3b82f6'));
    const result = await matchImage();
    expect(['created', 'passed']).toContain(result.status);
    expect(fs.existsSync(result.imgPath)).toBe(true);
    expect(fs.existsSync(result.imgNewPath)).toBe(false);
  });

  test('numbers repeated screenshots and supports locators and titles', async ({
    page,
    matchImage,
  }) => {
    await page.setContent(html('#3b82f6'));
    const first = await matchImage(page.locator('.card'));
    const second = await matchImage(page.locator('.card'), {
      title: 'card again',
    });
    expect(first.imgPath).toMatch(
      /matchImage numbers repeated screenshots and supports locators and titles_#0\.png$/,
    );
    expect(second.imgPath).toMatch(/card again_#0\.png$/);
  });

  test('fails on a real change and keeps actual and diff for review', async ({
    page,
    matchImage,
  }, testInfo) => {
    await page.setContent(html('#3b82f6'));
    const first = await matchImage(page.locator('.card'), {
      title: 'changing card',
    });
    // wherever the configured imagesPath put the baseline
    const dir = path.dirname(first.imgPath);
    await page.setContent(html('#ef4444'));

    // `changing card_#1` would get a fresh baseline; compare against #0 explicitly
    const failing = await matchImage(page.locator('.card'), {
      title: 'changing card',
      matchAgainstPath: path.join(dir, 'changing card_#0.png'),
    }).then(
      () => undefined,
      (e: Error) => e,
    );

    expect(failing).toBeInstanceOf(Error);
    expect(failing?.message).toMatch(
      /\[changing card_#1\] \d+ pixels \(.*%\) differ; the limit is 0\.1%/,
    );
    // the failure left the review files behind and attached them to the report
    expect(fs.existsSync(path.join(dir, 'changing card_#1.actual.png'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(dir, 'changing card_#1.diff.png'))).toBe(
      true,
    );
    expect(testInfo.attachments.map((a) => a.name)).toEqual([
      'changing card_#1-expected.png',
      'changing card_#1-actual.png',
      'changing card_#1-diff.png',
      'pixsame: review and replace baselines',
    ]);
    fs.rmSync(path.join(dir, 'changing card_#1.actual.png'));
    fs.rmSync(path.join(dir, 'changing card_#1.diff.png'));
  });

  test('stores the page layout in the baseline and names a move and a change', async ({
    page,
    matchImage,
  }) => {
    const layoutPage = (banner: string) => `<!doctype html>
<body style="margin:0;font:20px Arial">
  ${banner}
  <div id="card" style="margin:20px;padding:16px;width:300px;background:#dbeafe;border:2px solid #3b82f6">Order total</div>
  <p style="margin:20px">Shipping and returns</p>
</body>`;
    await page.setContent(layoutPage(''));
    const first = await matchImage(undefined, { title: 'layout card' });
    const baseline = fs.readFileSync(first.imgPath);
    expect(layoutVersionOf(baseline)).toBe(ANALYSIS_VERSION);
    expect(readLayout(baseline)?.size).toEqual({ width: 640, height: 400 });
    // what rendered it, so a later run on another system can tell
    expect(readLayout(baseline)?.env).toMatchObject({
      os: process.platform,
      browser: 'chromium',
    });

    await page.setContent(
      layoutPage(
        '<div id="promo" style="height:40px;background:#fde68a;margin:0">Free shipping</div>',
      ),
    );
    const failing = await matchImage(undefined, {
      title: 'layout card',
      matchAgainstPath: first.imgPath,
    }).then(
      () => undefined,
      (e: Error) => e,
    );
    const dir = path.dirname(first.imgPath);
    expect(failing?.message).toMatch(/moved down by 40 px/);
    expect(failing?.message).toMatch(/added div#promo/);
    fs.rmSync(path.join(dir, 'layout card_#1.actual.png'), { force: true });
    fs.rmSync(path.join(dir, 'layout card_#1.diff.png'), { force: true });
  });

  test('leaves what cannot be seen out of the layout of a large page', async ({
    page,
    matchImage,
  }) => {
    // 6000 rows in a box that shows ten of them
    await page.setContent(`<!doctype html><body style="margin:0">
<div style="height:320px;overflow:hidden"><div id="list">${Array.from(
      { length: 6000 },
      (_, i) => `<div style="height:32px"><b>Item ${i}</b></div>`,
    ).join('')}</div></div></body>`);
    const first = await matchImage(undefined, { title: 'large page' });
    const layout = readLayout(fs.readFileSync(first.imgPath));
    expect(layout?.count).toBeLessThan(100);
  });

  test('writes a manifest per worker that validates against the standard', async ({
    page,
    matchImage,
  }, testInfo) => {
    await page.setContent(html('#3b82f6'));
    await matchImage();
    const manifestPath = path.join(
      testInfo.project.outputDir,
      manifestFileNameFor(testInfo.workerIndex),
    );
    const manifest = readManifestFile(manifestPath);
    expect(validateManifest(manifest)).toEqual([]);
    expect(manifest).toMatchObject({
      reportFormat: 'visual-regression-manifest',
      specVersion: MANIFEST_SPEC_VERSION,
      tool: { name: '@pixsame/playwright-visual-regression-diff' },
      runner: { name: 'playwright', browser: { name: 'chromium' } },
    });
    const entry = manifest.entries.find((e) =>
      e.test.titlePath.join(' ').endsWith('validates against the standard'),
    );
    expect(entry).toMatchObject({
      test: { filePath: 'smoke.spec.ts' },
      renderer: { browser: 'chromium' },
      platform: { browser: { name: 'chromium' } },
      viewport: { width: 640, height: 400 },
    });
    expect(entry?.hashes?.baseline).toMatch(/^[0-9a-f]{64}$/);
  });
});
