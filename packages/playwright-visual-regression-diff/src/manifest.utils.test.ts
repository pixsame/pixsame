import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { dir, setGracefulCleanup } from 'tmp-promise';
import {
  ManifestWriter,
  isManifestFileName,
  parseManifestJson,
  readManifestFile,
  validateManifest,
} from '@frsource/visual-regression-manifest';
import { REMOTE_INFO_ENV_KEY } from './constants';
import {
  createManifestWriter,
  manifestFileNameFor,
  manifestPathFor,
  rendererFor,
  runnerFor,
  toManifestOptions,
  type ManifestWorkerInput,
} from './manifest.utils';

setGracefulCleanup();

const fixture = fs.readFileSync(
  path.resolve(__dirname, '..', '__tests__', 'fixtures', 'screenshot.png'),
);

const workerInput = (
  rootDir: string,
  overrides: Partial<ManifestWorkerInput> = {},
): ManifestWorkerInput => ({
  config: {
    rootDir,
    configFile: path.join(rootDir, 'playwright.config.ts'),
    workers: 2,
    shard: null,
  },
  project: {
    name: 'chromium',
    testDir: path.join(rootDir, 'tests'),
    outputDir: path.join(rootDir, 'test-results'),
    retries: 1,
    use: {
      baseURL: 'http://localhost:3000',
      viewport: { width: 640, height: 400 },
    },
  },
  parallelIndex: 0,
  browser: { name: 'chromium', version: '131.0.0.0', headless: true },
  options: { maxDiffThreshold: 0.02 },
  env: {},
  ...overrides,
});

describe('manifestFileNameFor / manifestPathFor', () => {
  it('names the file the way every manifest writer does, with a per-worker label', () => {
    expect(manifestFileNameFor(3)).toBe(
      'visual-regression-manifest.playwright.w3.json',
    );
    expect(isManifestFileName(manifestFileNameFor(0))).toBe(true);
  });

  it('defaults to the project outputDir, resolves a configured path against rootDir and honours false', () => {
    const where = {
      rootDir: '/proj',
      outputDir: '/proj/test-results',
      parallelIndex: 1,
    };
    expect(manifestPathFor(undefined, where)).toBe(
      path.join(
        '/proj/test-results',
        'visual-regression-manifest.playwright.w1.json',
      ),
    );
    expect(manifestPathFor('out/m.json', where)).toBe(
      path.resolve('/proj', 'out/m.json'),
    );
    expect(manifestPathFor(false, where)).toBeNull();
  });
});

describe('rendererFor', () => {
  it('is the local browser when no remote browser is in use', () => {
    expect(rendererFor('chromium', '131', {})).toEqual({
      backend: 'native',
      browser: 'chromium',
      browserVersion: '131',
    });
  });

  it('identifies the Docker image started by remoteBrowser()', () => {
    const env = {
      [REMOTE_INFO_ENV_KEY]: JSON.stringify({
        containerId: 'abc',
        image: 'mcr.microsoft.com/playwright:v1.63.0-noble',
        imageDigest: 'sha256:deadbeef',
        playwrightVersion: '1.63.0',
        wsEndpoint: 'ws://127.0.0.1:3000/',
        reused: false,
      }),
    };
    expect(rendererFor('chromium', '131', env)).toEqual({
      backend: 'docker',
      browser: 'chromium',
      browserVersion: '131',
      rendererVersion: '1.63.0',
      imageDigest: 'sha256:deadbeef',
    });
    const noDigest = {
      [REMOTE_INFO_ENV_KEY]: JSON.stringify({
        containerId: 'abc',
        image: 'x',
        playwrightVersion: '1.63.0',
        wsEndpoint: 'ws://127.0.0.1:3000/',
        reused: true,
      }),
    };
    expect(rendererFor('webkit', '18', noDigest)).not.toHaveProperty(
      'imageDigest',
    );
  });
});

describe('toManifestOptions', () => {
  it('records the resolved options in the shared vocabulary and drops callbacks', () => {
    expect(
      toManifestOptions({
        imagesPath: '{spec_path}/__image_snapshots__',
        maxDiffThreshold: 0.01,
        diffConfig: { threshold: 0.1 },
        createMissingImages: true,
        updateImages: 'failures-only',
        screenshotConfig: { fullPage: true, mask: () => [] },
      }),
    ).toEqual({
      imagesPath: '{spec_path}/__image_snapshots__',
      maxDiffThreshold: 0.01,
      diffConfig: { threshold: 0.1 },
      createMissingImages: true,
      updateImages: 'failures-only',
      forceDeviceScaleFactor: false,
      screenshotConfig: { fullPage: true },
    });
    expect(
      toManifestOptions({
        imagesPath: 'shots',
        maxDiffThreshold: 0,
        diffConfig: {},
        createMissingImages: false,
        updateImages: false,
        title: 'nav',
        matchAgainstPath: 'shots/other.png',
        screenshotConfig: {},
      }),
    ).toMatchObject({ title: 'nav', matchAgainstPath: 'shots/other.png' });
  });
});

describe('createManifestWriter', () => {
  it('describes the Playwright run in the runner block with rootDir-relative paths', async () => {
    const { path: root } = await dir();
    expect(runnerFor(workerInput(root))).toEqual({
      name: 'playwright',
      version: expect.any(String),
      mode: 'run',
      configFile: 'playwright.config.ts',
      browser: { name: 'chromium', version: '131.0.0.0', headless: true },
      baseUrl: 'http://localhost:3000',
      viewport: { width: 640, height: 400 },
      retries: 1,
      project: 'chromium',
      testDir: 'tests',
      outputDir: 'test-results',
      workers: 2,
      shard: undefined,
      parallelIndex: 0,
    });
    expect(
      runnerFor(
        workerInput(root, {
          config: {
            rootDir: root,
            workers: 1,
            shard: { current: 1, total: 2 },
          },
          project: {
            name: '',
            testDir: root,
            outputDir: path.join(root, 'out'),
            retries: 0,
            use: {},
          },
        }),
      ),
    ).toMatchObject({
      configFile: undefined,
      baseUrl: null,
      viewport: undefined,
      project: undefined,
      testDir: '.',
      shard: { current: 1, total: 2 },
    });
  });

  it('writes a manifest that validates against the standard and that consumers parse', async () => {
    const { path: root } = await dir();
    const manifestPath = manifestPathFor(undefined, {
      rootDir: root,
      outputDir: path.join(root, 'test-results'),
      parallelIndex: 0,
    }) as string;
    const writer = createManifestWriter(
      manifestPath,
      workerInput(root, {
        env: {
          GITHUB_ACTIONS: 'true',
          GITHUB_REPOSITORY: 'o/r',
          GITHUB_REF: 'refs/pull/7/merge',
          GITHUB_RUN_ID: '9',
        },
      }),
    );
    expect(writer).toBeInstanceOf(ManifestWriter);

    const shots = path.join(root, 'tests', '__image_snapshots__');
    fs.mkdirSync(shots, { recursive: true });
    fs.writeFileSync(path.join(shots, 'home_#0.png'), fixture);
    fs.writeFileSync(path.join(shots, 'home_#0.actual.png'), fixture);
    fs.writeFileSync(path.join(shots, 'home_#0.diff.png'), fixture);

    writer.record({
      actualPath: path.join(shots, 'home_#0.actual.png'),
      baselinePath: path.join(shots, 'home_#0.png'),
      testFile: path.join(root, 'tests', 'home.spec.ts'),
      titlePath: ['home', 'renders'],
      retry: 0,
      status: 'failed',
      diffRatio: 0.2,
      threshold: 0.01,
      baselineWritten: false,
      actualSize: { width: 2, height: 2 },
      baselineSize: { width: 1, height: 1 },
      platform: {
        os: 'linux',
        arch: 'x64',
        browser: { name: 'chromium', version: '131.0.0.0', headless: true },
      },
      viewport: { width: 640, height: 400 },
      options: toManifestOptions({
        imagesPath: '{spec_path}/__image_snapshots__',
        maxDiffThreshold: 0.01,
        diffConfig: {},
        createMissingImages: true,
        updateImages: false,
        screenshotConfig: {},
      }),
      renderer: rendererFor('chromium', '131.0.0.0', {}),
      message: '20% of pixels differ',
    });
    writer.record({
      actualPath: path.join(shots, 'nav_#0.actual.png'),
      baselinePath: path.join(shots, 'nav_#0.png'),
      testFile: path.join(root, 'tests', 'home.spec.ts'),
      titlePath: ['home', 'nav'],
      retry: 0,
      status: 'created',
      baselineWritten: true,
      message: 'created',
    });

    const manifest = readManifestFile(manifestPath);
    expect(validateManifest(manifest)).toEqual([]);
    expect(() =>
      parseManifestJson(fs.readFileSync(manifestPath, 'utf8'), manifestPath),
    ).not.toThrow();
    expect(manifest).toMatchObject({
      version: 1,
      projectRoot: root,
      ci: { provider: 'github', repository: 'o/r', pullRequest: { number: 7 } },
      options: { maxDiffThreshold: 0.02 },
      runner: { name: 'playwright', parallelIndex: 0 },
    });
    expect(manifest.entries.map((e) => [e.name, e.status])).toEqual([
      ['home_#0', 'failed'],
      ['nav_#0', 'created'],
    ]);
    expect(manifest.entries[0]).toMatchObject({
      test: { file: 'tests/home.spec.ts', titlePath: ['home', 'renders'] },
      images: {
        baseline: { path: 'tests/__image_snapshots__/home_#0.png', width: 1 },
        actual: { path: 'tests/__image_snapshots__/home_#0.actual.png' },
        diff: { path: 'tests/__image_snapshots__/home_#0.diff.png' },
      },
      renderer: { backend: 'native', browser: 'chromium' },
      hashes: { baseline: expect.stringMatching(/^[0-9a-f]{64}$/) },
    });
  });
});
