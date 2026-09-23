import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { dir, setGracefulCleanup } from 'tmp-promise';
import { ManifestWriter, type ManifestRecordInput } from './manifest';
import type { Manifest } from './manifest.types';

setGracefulCleanup();

const fixture = fs.readFileSync(
  path.resolve(__dirname, '..', '__tests__', 'fixtures', 'screenshot.png'),
);
const fixtureHash = createHash('sha256').update(fixture).digest('hex');

const writer = async (env: Record<string, string> = {}) => {
  const { path: root } = await dir();
  const manifestPath = path.join(root, 'test-results', 'manifest.json');
  const w = new ManifestWriter(manifestPath, {
    projectRoot: root,
    options: { maxDiffThreshold: 0.02 },
    runner: { name: 'playwright', version: '1.63.0', project: 'chromium' },
    env,
  });
  return { w, root, manifestPath };
};

const input = (
  root: string,
  overrides: Partial<ManifestRecordInput> = {},
): ManifestRecordInput => ({
  actualPath: path.join(
    root,
    'tests',
    '__image_snapshots__',
    'home_#0.actual.png',
  ),
  baselinePath: path.join(root, 'tests', '__image_snapshots__', 'home_#0.png'),
  testFile: path.join(root, 'tests', 'home.spec.ts'),
  titlePath: ['home', 'renders'],
  retry: 0,
  status: 'passed',
  diffRatio: 0,
  threshold: 0.01,
  baselineWritten: false,
  message: 'ok',
  ...overrides,
});

const read = (file: string): Manifest =>
  JSON.parse(fs.readFileSync(file, 'utf8'));

describe('ManifestWriter', () => {
  it('writes the shared manifest shape with project-relative paths and hashes', async () => {
    const { w, root, manifestPath } = await writer();
    const i = input(root, {
      status: 'failed',
      diffRatio: 0.2,
      imgNewSize: { width: 2, height: 2 },
      imgOldSize: { width: 1, height: 1 },
      platform: {
        os: 'linux',
        arch: 'x64',
        browser: { name: 'chromium', version: '131' },
      },
      viewport: { width: 1280, height: 720 },
      renderer: {
        backend: 'native',
        browser: 'chromium',
        browserVersion: '131',
      },
    });
    fs.mkdirSync(path.dirname(i.actualPath), { recursive: true });
    fs.writeFileSync(i.actualPath, fixture);
    fs.writeFileSync(i.actualPath.replace('.actual', '.diff'), fixture);

    const entry = w.record(i);

    expect(entry).toEqual({
      name: 'home_#0',
      test: {
        file: 'tests/home.spec.ts',
        titlePath: ['home', 'renders'],
        retry: 0,
      },
      status: 'failed',
      comparison: { diffRatio: 0.2, threshold: 0.01 },
      images: {
        baseline: {
          path: 'tests/__image_snapshots__/home_#0.png',
          width: 1,
          height: 1,
        },
        actual: {
          path: 'tests/__image_snapshots__/home_#0.actual.png',
          width: 2,
          height: 2,
        },
        diff: { path: 'tests/__image_snapshots__/home_#0.diff.png' },
      },
      baselineWritten: false,
      recordedAt: expect.any(String),
      platform: i.platform,
      viewport: { width: 1280, height: 720 },
      options: undefined,
      renderer: i.renderer,
      hashes: { actual: fixtureHash, diff: fixtureHash },
      message: 'ok',
    });
    expect(read(manifestPath)).toEqual({
      version: 1,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      projectRoot: root,
      platform: {
        os: process.platform,
        arch: process.arch,
        osVersion: expect.any(String),
      },
      ci: null,
      options: { maxDiffThreshold: 0.02 },
      runner: { name: 'playwright', version: '1.63.0', project: 'chromium' },
      entries: [entry],
    });
    expect(fs.existsSync(`${manifestPath}.tmp`)).toBe(false);
  });

  it('nulls missing files, dedupes by actual path and drops earlier attempts on retry', async () => {
    const { w, root } = await writer();
    w.record(input(root, { status: 'created' }));
    w.record(input(root, { status: 'passed' }));
    expect(w.getEntries()).toHaveLength(1);
    expect(w.getEntries()[0]).toMatchObject({
      status: 'passed',
      images: { actual: { path: null }, diff: { path: null } },
      hashes: {},
    });

    w.record(
      input(root, {
        actualPath: path.join(root, 'tests', 'x', 'home_#1.actual.png'),
      }),
    );
    w.record(input(root, { retry: 1 }));
    expect(w.getEntries().map((e) => [e.name, e.test.retry])).toEqual([
      ['home_#0', 1],
    ]);
  });

  it('detects CI from the given environment', async () => {
    const { w, root } = await writer({
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'o/r',
      GITHUB_REF: 'refs/pull/7/merge',
      GITHUB_RUN_ID: '9',
    });
    w.record(input(root));
    expect(read(w.manifestPath).ci).toMatchObject({
      provider: 'github',
      repository: 'o/r',
      pullRequest: { number: 7 },
      runId: '9',
    });
  });
});
