import { it, expect, describe, beforeEach } from 'vitest';
import path from 'path';
import { createHash } from 'crypto';
import { existsSync, promises as fs, readFileSync } from 'fs';
import { dir, setGracefulCleanup } from 'tmp-promise';
import {
  dropSpecEntries,
  getManifestEntries,
  getManifestPath,
  getPluginOptions,
  initManifestRun,
  markManifestEntryApproved,
  recordManifestEntry,
  resetManifest,
  setManifestBrowser,
  toPosix,
  type ManifestConfig,
  type ManifestRecordInput,
} from './manifest.utils';
import type { Manifest, ManifestEntryOptions } from './types';

setGracefulCleanup();

const fixturesPath = path.resolve(__dirname, '..', '__tests__', 'fixtures');

const config = async (
  overrides: Partial<Record<string, unknown>> = {},
): Promise<ManifestConfig> => {
  const { path: projectRoot } = await dir();
  return {
    projectRoot,
    screenshotsFolder: path.join(projectRoot, 'cypress', 'screenshots'),
    testingType: 'e2e',
    version: '16.1.0',
    expose: {},
    env: {},
    configFile: path.join(projectRoot, 'cypress.config.ts'),
    isTextTerminal: true,
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1000,
    viewportHeight: 660,
    ...overrides,
  } as ManifestConfig;
};

// run-level data of `cfg`, detached from the machine's environment
const startRun = (cfg: ManifestConfig) => initManifestRun(cfg, undefined, {});

const platform = {
  os: 'linux',
  arch: 'x64',
  browser: { name: 'chrome', version: '130' },
};
const options: ManifestEntryOptions = {
  imagesPath: '{spec_path}/__image_snapshots__',
  maxDiffThreshold: 0.01,
  diffConfig: {},
  createMissingImages: true,
  updateImages: false,
  forceDeviceScaleFactor: true,
  screenshotConfig: {},
};

const readManifest = (cfg: ManifestConfig): Manifest =>
  JSON.parse(readFileSync(getManifestPath(cfg) as string, 'utf8'));

const writeFixture = async (target: string) => {
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(path.join(fixturesPath, 'screenshot.png'), target);
  return target;
};
const fixtureHash = createHash('sha256')
  .update(readFileSync(path.join(fixturesPath, 'screenshot.png')))
  .digest('hex');

const input = (
  cfg: ManifestConfig,
  overrides: Partial<ManifestRecordInput> = {},
): ManifestRecordInput => ({
  imgNew: path.join(cfg.projectRoot as string, 'shots', 'home_#0.actual.png'),
  imgOld: path.join(cfg.projectRoot as string, 'shots', 'home_#0.png'),
  specPath: 'cypress/e2e/home.cy.ts',
  testTitlePath: ['home', 'renders'],
  currentRetryNumber: 0,
  status: 'passed',
  imgDiff: 0,
  maxDiffThreshold: 0.01,
  baselineWritten: false,
  message: 'ok',
  ...overrides,
});

beforeEach(() => resetManifest({}, undefined, {}));

describe('getManifestPath', () => {
  it('defaults to a per-testing-type file inside screenshotsFolder', async () => {
    const cfg = await config();
    expect(getManifestPath(cfg)).toBe(
      path.join(
        cfg.screenshotsFolder as string,
        'visual-regression-manifest.e2e.json',
      ),
    );
  });

  it('falls back to cypress/screenshots when screenshotsFolder is disabled', async () => {
    const cfg = await config({
      screenshotsFolder: false,
      testingType: undefined,
    });
    expect(getManifestPath(cfg)).toBe(
      path.join(
        cfg.projectRoot as string,
        'cypress',
        'screenshots',
        'visual-regression-manifest.json',
      ),
    );
  });

  it('resolves a relative custom path against projectRoot', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: 'reports/visual.json' },
    });
    expect(getManifestPath(cfg)).toBe(
      path.join(cfg.projectRoot as string, 'reports', 'visual.json'),
    );
  });

  it('keeps an absolute custom path', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: '/tmp/visual.json' },
    });
    expect(getManifestPath(cfg)).toBe(path.resolve('/tmp/visual.json'));
  });

  it.each([false, 'false'])('is disabled by %j', async (value) => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: value },
    });
    expect(getManifestPath(cfg)).toBeNull();
  });

  it('reads the option from env on Cypress <15.10', async () => {
    const cfg = await config({
      version: '13.17.0',
      env: { pluginVisualRegressionManifestPath: 'from-env.json' },
      expose: { pluginVisualRegressionManifestPath: 'from-expose.json' },
    });
    expect(getManifestPath(cfg)).toBe(
      path.join(cfg.projectRoot as string, 'from-env.json'),
    );
  });

  it('is disabled without projectRoot', () => {
    expect(getManifestPath({})).toBeNull();
  });
});

describe('toPosix', () => {
  it('replaces the given separator only', () => {
    expect(toPosix('a\\b\\c', '\\')).toBe('a/b/c');
    expect(toPosix('a/b\\c', '/')).toBe('a/b\\c');
  });
});

describe('recordManifestEntry', () => {
  it('writes an entry mapped to the manifest contract', async () => {
    const cfg = await config();
    const actual = await writeFixture(input(cfg).imgNew);
    await writeFixture(actual.replace('.actual.png', '.diff.png'));

    startRun(cfg);
    const entry = recordManifestEntry(
      cfg,
      input(cfg, {
        status: 'failed',
        imgDiff: 0.25,
        imgNewSize: { width: 250, height: 181 },
        imgOldSize: { width: 125, height: 125 },
        platform,
        viewport: { width: 1280, height: 720 },
        options,
        message: 'differs',
      }),
    );

    expect(entry).toEqual({
      name: 'home_#0',
      test: {
        file: 'cypress/e2e/home.cy.ts',
        titlePath: ['home', 'renders'],
        retry: 0,
      },
      status: 'failed',
      comparison: { diffRatio: 0.25, threshold: 0.01 },
      images: {
        baseline: { path: 'shots/home_#0.png', width: 125, height: 125 },
        actual: { path: 'shots/home_#0.actual.png', width: 250, height: 181 },
        diff: { path: 'shots/home_#0.diff.png' },
      },
      baselineWritten: false,
      recordedAt: expect.any(String),
      platform,
      viewport: { width: 1280, height: 720 },
      options,
      renderer: { backend: 'native', browser: 'chrome', browserVersion: '130' },
      // the baseline does not exist on disk, so it has no hash
      hashes: { actual: fixtureHash, diff: fixtureHash },
      message: 'differs',
    });
    expect(readManifest(cfg)).toEqual({
      version: 1,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      projectRoot: cfg.projectRoot,
      platform: {
        os: process.platform,
        arch: process.arch,
        osVersion: expect.any(String),
      },
      ci: null,
      options: {},
      runner: {
        name: 'cypress',
        version: '16.1.0',
        testingType: 'e2e',
        mode: 'run',
        configFile: 'cypress.config.ts',
        baseUrl: 'http://localhost:3000',
        viewport: { width: 1000, height: 660 },
      },
      entries: [entry],
    });
    expect(existsSync(`${getManifestPath(cfg)}.tmp`)).toBe(false);
  });

  it('nulls image paths of files that do not exist and omits unknown sizes', async () => {
    const cfg = await config();

    const entry = recordManifestEntry(cfg, input(cfg, { status: 'created' }));

    expect(entry?.images).toEqual({
      baseline: { path: 'shots/home_#0.png' },
      actual: { path: null },
      diff: { path: null },
    });
    expect(entry).not.toHaveProperty('images.baseline.width');
    expect(entry?.hashes).toEqual({});
  });

  it('keeps the renderer it is given and derives a native one otherwise', async () => {
    const cfg = await config();
    const renderer = {
      backend: 'docker' as const,
      browser: 'chromium',
      browserVersion: '131.0.6778.33',
      rendererVersion: '1.2.0',
      imageDigest: 'sha256:abc',
    };

    expect(
      recordManifestEntry(cfg, input(cfg, { platform, renderer }))?.renderer,
    ).toEqual(renderer);
    expect(
      recordManifestEntry(
        cfg,
        input(cfg, {
          platform: { os: 'linux', browser: { name: 'electron', version: '' } },
        }),
      )?.renderer,
    ).toEqual({ backend: 'native', browser: 'electron' });
    expect(recordManifestEntry(cfg, input(cfg))?.renderer).toBeUndefined();
  });

  it('resolves relative and unnormalized paths against projectRoot and dedupes by actual path', async () => {
    const cfg = await config();

    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: 'shots/../shots/home_#0.actual.png',
        imgOld: 'reference/home.png',
      }),
    );
    recordManifestEntry(cfg, input(cfg, { status: 'failed' }));

    const [entry, ...rest] = getManifestEntries();
    expect(rest).toHaveLength(0);
    expect(entry.status).toBe('failed');
    expect(entry.images.baseline.path).toBe('shots/home_#0.png');
  });

  it('keeps a baseline outside projectRoot resolvable', async () => {
    const cfg = await config();
    const outside = path.join(cfg.projectRoot as string, '..', 'ref.png');

    const entry = recordManifestEntry(cfg, input(cfg, { imgOld: outside }));

    expect(entry?.images.baseline.path).toBe('../ref.png');
  });

  it('purges entries of earlier attempts of the same test on retry', async () => {
    const cfg = await config();
    const root = cfg.projectRoot as string;
    const shot = (n: number) =>
      path.join(root, 'shots', `home_#${n}.actual.png`);
    for (const n of [0, 1, 2]) {
      recordManifestEntry(cfg, input(cfg, { imgNew: shot(n) }));
    }
    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: path.join(root, 'shots', 'other_#0.actual.png'),
        testTitlePath: ['other'],
      }),
    );

    recordManifestEntry(
      cfg,
      input(cfg, { imgNew: shot(0), currentRetryNumber: 1, status: 'failed' }),
    );

    expect(
      getManifestEntries().map(({ name, test: { retry }, status }) => ({
        name,
        retry,
        status,
      })),
    ).toEqual([
      { name: 'home_#0', retry: 1, status: 'failed' },
      { name: 'other_#0', retry: 0, status: 'passed' },
    ]);
  });

  it('sorts entries by test file, then name', async () => {
    const cfg = await config();
    const root = cfg.projectRoot as string;
    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: path.join(root, 'b_#0.actual.png'),
        specPath: 'z.cy.ts',
      }),
    );
    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: path.join(root, 'b_#0.actual.png'),
        specPath: 'a.cy.ts',
      }),
    );
    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: path.join(root, 'a_#0.actual.png'),
        specPath: 'z.cy.ts',
      }),
    );

    expect(
      readManifest(cfg).entries.map((e) => `${e.test.file}:${e.name}`),
    ).toEqual(['a.cy.ts:b_#0', 'z.cy.ts:a_#0']);
  });

  it('is a no-op when disabled', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: false },
    });

    expect(recordManifestEntry(cfg, input(cfg))).toBeNull();
    expect(getManifestEntries()).toHaveLength(0);
    expect(existsSync(cfg.screenshotsFolder as string)).toBe(false);
  });
});

describe('markManifestEntryApproved', () => {
  it('flips an existing entry to approved and clears actual/diff paths', async () => {
    const cfg = await config();
    recordManifestEntry(
      cfg,
      input(cfg, {
        status: 'failed',
        imgDiff: 0.3,
        imgNewSize: { width: 10, height: 10 },
        platform,
        viewport: { width: 1280, height: 720 },
        options,
      }),
    );
    // approveImageTask moved the `.actual.png` over the baseline by now
    await writeFixture(input(cfg).imgOld);

    const entry = markManifestEntryApproved(cfg, {
      img: input(cfg).imgNew,
      imgOld: input(cfg).imgOld,
    });

    expect(entry).toMatchObject({
      name: 'home_#0',
      test: { file: 'cypress/e2e/home.cy.ts', titlePath: ['home', 'renders'] },
      status: 'approved',
      comparison: { diffRatio: 0.3, threshold: 0.01 },
      images: {
        baseline: { path: 'shots/home_#0.png' },
        actual: { path: null, width: 10, height: 10 },
        diff: { path: null },
      },
      baselineWritten: true,
      recordedAt: expect.any(String),
      platform,
      viewport: { width: 1280, height: 720 },
      options,
      renderer: { backend: 'native', browser: 'chrome', browserVersion: '130' },
      hashes: { baseline: fixtureHash },
    });
    expect(readManifest(cfg).entries).toEqual([entry]);
  });

  it('creates a minimal entry when nothing was recorded for the screenshot', async () => {
    const cfg = await config();

    const entry = markManifestEntryApproved(cfg, {
      img: 'shots/fresh_#0.actual.png',
      specPath: 'cypress\\e2e\\fresh.cy.ts'.split('\\').join(path.sep),
    });

    expect(entry).toEqual({
      name: 'fresh_#0',
      test: { file: 'cypress/e2e/fresh.cy.ts', titlePath: [], retry: 0 },
      status: 'approved',
      comparison: { diffRatio: 0, threshold: 0 },
      images: {
        baseline: { path: 'shots/fresh_#0.png' },
        actual: { path: null },
        diff: { path: null },
      },
      baselineWritten: true,
      recordedAt: expect.any(String),
      platform: undefined,
      viewport: undefined,
      options: undefined,
      renderer: undefined,
      hashes: {},
      message: 'Baseline image was replaced with the approved screenshot.',
    });
  });

  it('is a no-op when disabled', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: 'false' },
    });
    expect(markManifestEntryApproved(cfg, { img: 'x.actual.png' })).toBeNull();
  });
});

describe('dropSpecEntries', () => {
  it('removes only the entries of the given test file', async () => {
    const cfg = await config();
    const root = cfg.projectRoot as string;
    recordManifestEntry(cfg, input(cfg));
    recordManifestEntry(
      cfg,
      input(cfg, {
        imgNew: path.join(root, 'about_#0.actual.png'),
        specPath: 'cypress/e2e/about.cy.ts',
      }),
    );

    dropSpecEntries(cfg, path.join('cypress', 'e2e', 'home.cy.ts'));

    expect(readManifest(cfg).entries.map((e) => e.name)).toEqual(['about_#0']);
  });

  it('does not rewrite the file when nothing matched', async () => {
    const cfg = await config();
    recordManifestEntry(cfg, input(cfg));
    const before = (await fs.stat(getManifestPath(cfg) as string)).mtimeMs;

    dropSpecEntries(cfg, 'cypress/e2e/none.cy.ts');

    expect((await fs.stat(getManifestPath(cfg) as string)).mtimeMs).toBe(
      before,
    );
    expect(getManifestEntries()).toHaveLength(1);
  });

  it('is a no-op when disabled', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: false },
    });
    expect(() => dropSpecEntries(cfg, 'a.cy.ts')).not.toThrow();
  });
});

describe('resetManifest', () => {
  it('forgets entries and deletes a leftover file', async () => {
    const cfg = await config();
    recordManifestEntry(cfg, input(cfg));
    const manifestPath = getManifestPath(cfg) as string;
    expect(existsSync(manifestPath)).toBe(true);

    resetManifest(cfg, undefined, {});

    expect(getManifestEntries()).toHaveLength(0);
    expect(existsSync(manifestPath)).toBe(false);
  });

  it('tolerates a missing file', async () => {
    const cfg = await config();
    expect(() => resetManifest(cfg)).not.toThrow();
  });
});

describe('getPluginOptions', () => {
  it('strips the plugin prefix and keeps values verbatim', () => {
    expect(
      getPluginOptions({
        version: '16.1.0',
        expose: {
          pluginVisualRegressionUpdateImages: 'true',
          pluginVisualRegressionDiffConfig: { threshold: 0.1 },
          pluginVisualRegression: 'ignored, nothing after the prefix',
          somethingElse: 1,
        },
        env: { pluginVisualRegressionMaxDiffThreshold: 0 },
      }),
    ).toEqual({ updateImages: 'true', diffConfig: { threshold: 0.1 } });
  });

  it('reads env on Cypress <15.10', () => {
    expect(
      getPluginOptions({
        version: '13.17.0',
        expose: { pluginVisualRegressionUpdateImages: true },
        env: { pluginVisualRegressionMaxDiffThreshold: 0 },
      }),
    ).toEqual({ maxDiffThreshold: 0 });
  });

  it('copes with a config without expose/env', () => {
    expect(getPluginOptions({ version: '16.1.0' })).toEqual({});
    expect(getPluginOptions({})).toEqual({});
  });
});

describe('run-level data', () => {
  it('records the mode, options and CI block detected from the given environment', async () => {
    const cfg = await config({
      isTextTerminal: false,
      expose: { pluginVisualRegressionUpdateImages: true },
      specPattern: 'cypress/e2e/**/*.cy.ts',
      retries: { runMode: 2, openMode: 0 },
    });
    initManifestRun(cfg, undefined, {
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_REF: 'refs/heads/main',
    });
    recordManifestEntry(cfg, input(cfg));

    expect(readManifest(cfg)).toMatchObject({
      ci: { provider: 'github', repository: 'o/r' },
      options: { updateImages: true },
      runner: {
        mode: 'open',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        retries: { runMode: 2, openMode: 0 },
      },
    });
    expect(readManifest(cfg).runner).not.toHaveProperty('specs');
  });

  it('treats a non-interactive config without isTextTerminal as run mode', async () => {
    const cfg = await config({
      isTextTerminal: undefined,
      isInteractive: false,
    });
    expect(startRun(cfg).runner.mode).toBe('run');
    expect(
      initManifestRun(
        { ...cfg, isTextTerminal: undefined, isInteractive: undefined },
        undefined,
        {},
      ).runner.mode,
    ).toBe('open');
  });

  it('merges the before:run details and refreshes createdAt on reset', async () => {
    const cfg = await config({ specPattern: 'from-config' });
    startRun(cfg);
    recordManifestEntry(cfg, input(cfg));
    const first = readManifest(cfg);

    await new Promise((resolve) => setTimeout(resolve, 5));
    resetManifest(
      cfg,
      {
        cypressVersion: '16.2.0',
        browser: {
          name: 'chrome',
          family: 'chromium',
          version: '130.0',
          isHeadless: true,
        } as Cypress.Browser,
        specs: [
          { relative: path.join('cypress', 'e2e', 'a.cy.ts') },
          { relative: path.join('cypress', 'e2e', 'b.cy.ts') },
        ] as Cypress.Spec[],
        specPattern: 'from-details',
        system: { osName: 'linux', osVersion: 'Ubuntu - 24.04' },
        runUrl: 'https://cloud.cypress.io/runs/1',
        group: 'g',
        tag: 't',
        parallel: true,
      },
      {},
    );
    expect(getManifestEntries()).toHaveLength(0);
    recordManifestEntry(cfg, input(cfg));

    const manifest = readManifest(cfg);
    expect(manifest.createdAt > first.createdAt).toBe(true);
    expect(manifest.platform.osVersion).toBe('Ubuntu - 24.04');
    expect(manifest.runner).toEqual({
      name: 'cypress',
      version: '16.2.0',
      testingType: 'e2e',
      mode: 'run',
      configFile: 'cypress.config.ts',
      browser: {
        name: 'chrome',
        version: '130.0',
        family: 'chromium',
        headless: true,
      },
      specs: ['cypress/e2e/a.cy.ts', 'cypress/e2e/b.cy.ts'],
      specPattern: 'from-details',
      baseUrl: 'http://localhost:3000',
      viewport: { width: 1000, height: 660 },
      cloud: {
        runUrl: 'https://cloud.cypress.io/runs/1',
        group: 'g',
        tag: 't',
        parallel: true,
      },
    });
  });

  it('seeds the run lazily when nothing initialised it', async () => {
    const cfg = await config();
    resetManifest({}, undefined, {});
    // simulate a process where only the entry gets recorded
    recordManifestEntry(cfg, input(cfg));
    expect(readManifest(cfg).runner.name).toBe('cypress');
  });
});

describe('setManifestBrowser', () => {
  it('stores the launched browser and only rewrites the file once entries exist', async () => {
    const cfg = await config();
    startRun(cfg);
    const manifestPath = getManifestPath(cfg) as string;

    setManifestBrowser(cfg, { name: 'electron', version: '130' });
    expect(existsSync(manifestPath)).toBe(false);

    recordManifestEntry(cfg, input(cfg));
    expect(readManifest(cfg).runner.browser).toEqual({
      name: 'electron',
      version: '130',
    });

    setManifestBrowser(cfg, {
      name: 'firefox',
      version: '131',
      family: 'firefox',
      isHeadless: false,
    });
    expect(readManifest(cfg).runner.browser).toEqual({
      name: 'firefox',
      version: '131',
      family: 'firefox',
      headless: false,
    });
  });

  it('is a no-op when disabled', async () => {
    const cfg = await config({
      expose: { pluginVisualRegressionManifestPath: false },
    });
    expect(() =>
      setManifestBrowser(cfg, { name: 'chrome', version: '1' }),
    ).not.toThrow();
  });
});
