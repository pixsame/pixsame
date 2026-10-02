import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { png, tmpDir, writePng } from '../__tests__/helpers';
import {
  actualSiblingOf,
  baselineSiblingOf,
  createManifestHeader,
  diffSiblingOf,
  ManifestBuilder,
  nameFromImagePath,
  nativeRenderer,
} from './builder';

const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex');

const runner = { name: 'test-runner', version: '1' };

const builderIn = (projectRoot: string) =>
  new ManifestBuilder({ projectRoot, runner, ci: null });

describe('createManifestHeader', () => {
  it('fills the defaults from the host and the environment', () => {
    const header = createManifestHeader({
      projectRoot: '/p',
      runner,
      env: { GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'o/r' },
    });
    expect(header).toEqual({
      createdAt: expect.any(String),
      projectRoot: '/p',
      platform: {
        os: process.platform,
        arch: process.arch,
        osVersion: expect.any(String),
      },
      ci: expect.objectContaining({ provider: 'github', repository: 'o/r' }),
      options: {},
      runner,
    });
  });

  it('keeps what it is given, including an explicit null ci and upload', () => {
    const header = createManifestHeader({
      projectRoot: '/p',
      runner,
      ci: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      platform: { os: 'linux', arch: 'arm64' },
      options: { a: 1 },
      upload: { buildId: 'b', url: 'u', level: 'images' },
      env: { GITHUB_ACTIONS: 'true' },
    });
    expect(header).toEqual({
      createdAt: '2026-01-01T00:00:00.000Z',
      projectRoot: '/p',
      platform: { os: 'linux', arch: 'arm64' },
      ci: null,
      options: { a: 1 },
      runner,
      upload: { buildId: 'b', url: 'u', level: 'images' },
    });
  });
});

describe('path helpers', () => {
  it('derive sibling image paths and names', () => {
    expect(nameFromImagePath('/x/home_#0.actual.png')).toBe('home_#0');
    expect(nameFromImagePath('/x/home_#0.png')).toBe('home_#0');
    expect(diffSiblingOf('/x/home.actual.png')).toBe('/x/home.diff.png');
    expect(diffSiblingOf('/x/home.png')).toBeNull();
    expect(baselineSiblingOf('/x/home.actual.png')).toBe('/x/home.png');
    expect(baselineSiblingOf('/x/home.png')).toBe('/x/home.png');
    expect(actualSiblingOf('/x/home.png')).toBe('/x/home.actual.png');
    expect(nativeRenderer(undefined)).toBeUndefined();
    expect(
      nativeRenderer({ os: 'linux', browser: { name: 'chrome' } }),
    ).toEqual({ backend: 'native', browser: 'chrome' });
  });
});

describe('ManifestBuilder', () => {
  it('records an entry with project-relative paths, hashes and defaults', async () => {
    const root = await tmpDir();
    const actual = writePng(
      path.join(root, 'shots', 'home_#0.actual.png'),
      3,
      2,
      1,
    );
    writePng(path.join(root, 'shots', 'home_#0.diff.png'), 3, 2, 2);
    const builder = builderIn(root);

    const entry = builder.record({
      actualPath: 'shots/home_#0.actual.png',
      baselinePath: path.join(root, 'shots', 'home_#0.png'),
      testFile: path.join(root, 'e2e', 'home.spec.ts'),
      titlePath: ['home', 'renders'],
      status: 'failed',
      diffRatio: 0.25,
      threshold: 0.01,
      actualSize: { width: 3, height: 2 },
      platform: { os: 'linux', browser: { name: 'chrome', version: '130' } },
      viewport: { width: 1280, height: 720 },
      message: 'differs',
    });

    expect(entry).toEqual({
      name: 'home_#0',
      test: {
        file: 'e2e/home.spec.ts',
        titlePath: ['home', 'renders'],
        retry: 0,
      },
      status: 'failed',
      comparison: { diffRatio: 0.25, threshold: 0.01 },
      images: {
        baseline: { path: 'shots/home_#0.png' },
        actual: { path: 'shots/home_#0.actual.png', width: 3, height: 2 },
        diff: { path: 'shots/home_#0.diff.png' },
      },
      baselineWritten: false,
      recordedAt: expect.any(String),
      platform: { os: 'linux', browser: { name: 'chrome', version: '130' } },
      viewport: { width: 1280, height: 720 },
      options: undefined,
      renderer: { backend: 'native', browser: 'chrome', browserVersion: '130' },
      hashes: { actual: sha(png(3, 2, 1)), diff: sha(png(3, 2, 2)) },
      message: 'differs',
    });
    expect(builder.size).toBe(1);
    expect(builder.entries()).toEqual([entry]);
    expect(fs.existsSync(actual)).toBe(true);
  });

  it('applies the defaults of a minimal input', async () => {
    const root = await tmpDir();
    const entry = builderIn(root).record({
      actualPath: 'home.png',
      baselinePath: 'base/home.png',
      status: 'passed',
    });
    expect(entry).toMatchObject({
      name: 'home',
      test: { file: '', titlePath: [], retry: 0 },
      comparison: { diffRatio: 0, threshold: 0 },
      images: {
        baseline: { path: 'base/home.png' },
        actual: { path: null },
        diff: { path: null },
      },
      hashes: {},
      message: '',
    });
    expect(entry.renderer).toBeUndefined();
  });

  it('honours an explicit diff path, name and renderer', async () => {
    const root = await tmpDir();
    writePng(path.join(root, 'out', 'd.png'));
    const entry = builderIn(root).record({
      actualPath: 'out/a.png',
      baselinePath: 'b.png',
      diffPath: 'out/d.png',
      name: 'custom',
      status: 'failed',
      platform: { os: 'linux', browser: { name: 'chrome' } },
      renderer: {
        backend: 'docker',
        browser: 'chromium',
        imageDigest: 'sha256:1',
      },
    });
    expect(entry.name).toBe('custom');
    expect(entry.images.diff.path).toBe('out/d.png');
    expect(entry.hashes).toEqual({ diff: expect.any(String) });
    expect(entry.renderer?.backend).toBe('docker');
    expect(
      builderIn(root).record({
        actualPath: 'out/a.png',
        baselinePath: 'b.png',
        diffPath: null,
        status: 'failed',
      }).images.diff.path,
    ).toBeNull();
  });

  it('dedupes by actual path and keeps paths outside the project resolvable', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    builder.record({
      actualPath: 'shots/../shots/a.actual.png',
      baselinePath: 'a.png',
      status: 'passed',
    });
    builder.record({
      actualPath: path.join(root, 'shots', 'a.actual.png'),
      baselinePath: '/elsewhere/a.png',
      status: 'failed',
    });
    expect(builder.entries()).toHaveLength(1);
    expect(builder.entries()[0]).toMatchObject({
      status: 'failed',
      images: {
        baseline: {
          path: expect.stringMatching(/^(\.\.\/)+elsewhere\/a\.png$/),
        },
      },
    });
  });

  it('purges entries of earlier attempts of the same test on retry', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    const test = {
      testFile: 'e2e/home.spec.ts',
      titlePath: ['home', 'renders'],
    };
    builder.record({
      ...test,
      actualPath: 'a_#0.actual.png',
      baselinePath: 'a_#0.png',
      status: 'failed',
    });
    builder.record({
      ...test,
      actualPath: 'a_#1.actual.png',
      baselinePath: 'a_#1.png',
      status: 'failed',
    });
    builder.record({
      ...test,
      titlePath: ['home', 'other'],
      actualPath: 'o_#0.actual.png',
      baselinePath: 'o_#0.png',
      status: 'passed',
    });
    builder.record({
      ...test,
      retry: 1,
      actualPath: 'a_#0.actual.png',
      baselinePath: 'a_#0.png',
      status: 'passed',
    });
    expect(
      builder.entries().map((e) => [e.name, e.test.retry, e.status]),
    ).toEqual([
      ['a_#0', 1, 'passed'],
      ['o_#0', 0, 'passed'],
    ]);
  });

  it('sorts entries by test file, then name', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    builder.record({
      testFile: 'b.spec.ts',
      actualPath: 'z.png',
      baselinePath: 'z.png',
      status: 'passed',
    });
    builder.record({
      testFile: 'a.spec.ts',
      actualPath: 'y.png',
      baselinePath: 'y.png',
      status: 'passed',
    });
    builder.record({
      testFile: 'a.spec.ts',
      actualPath: 'x.png',
      baselinePath: 'x.png',
      status: 'passed',
    });
    expect(builder.entries().map((e) => e.name)).toEqual(['x', 'y', 'z']);
  });

  it('approves a recorded entry and creates a minimal one otherwise', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    builder.record({
      actualPath: 'shots/home.actual.png',
      baselinePath: 'shots/home.png',
      testFile: 'e2e/home.spec.ts',
      titlePath: ['home'],
      status: 'failed',
      diffRatio: 0.3,
      threshold: 0.01,
      actualSize: { width: 10, height: 10 },
      platform: { os: 'linux', browser: { name: 'chrome' } },
    });
    writePng(path.join(root, 'shots', 'home.png'), 10, 10, 7);

    const approved = builder.approve({ actualPath: 'shots/home.actual.png' });
    expect(approved).toEqual({
      name: 'home',
      test: { file: 'e2e/home.spec.ts', titlePath: ['home'], retry: 0 },
      status: 'approved',
      comparison: { diffRatio: 0.3, threshold: 0.01 },
      images: {
        baseline: { path: 'shots/home.png' },
        actual: { path: null, width: 10, height: 10 },
        diff: { path: null },
      },
      baselineWritten: true,
      recordedAt: expect.any(String),
      platform: { os: 'linux', browser: { name: 'chrome' } },
      viewport: undefined,
      options: undefined,
      renderer: { backend: 'native', browser: 'chrome' },
      hashes: { baseline: sha(png(10, 10, 7)) },
      message: 'Baseline image was replaced with the approved screenshot.',
    });
    expect(builder.entries()).toEqual([approved]);

    const fresh = builder.approve({
      actualPath: 'other/x.actual.png',
      baselinePath: 'other/custom.png',
      testFile: 'e2e/x.spec.ts',
      message: 'ok',
    });
    expect(fresh).toMatchObject({
      name: 'x',
      test: { file: 'e2e/x.spec.ts', titlePath: [], retry: 0 },
      status: 'approved',
      comparison: { diffRatio: 0, threshold: 0 },
      images: {
        baseline: { path: 'other/custom.png' },
        actual: { path: null },
        diff: { path: null },
      },
      hashes: {},
      message: 'ok',
    });
    expect(fresh.renderer).toBeUndefined();
  });

  it('drops the entries of one test file and clears everything', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    builder.record({
      testFile: 'a.spec.ts',
      actualPath: 'a.png',
      baselinePath: 'a.png',
      status: 'passed',
    });
    builder.record({
      testFile: path.join(root, 'b.spec.ts'),
      actualPath: 'b.png',
      baselinePath: 'b.png',
      status: 'passed',
    });
    expect(builder.dropTestFile('nope.spec.ts')).toBe(false);
    expect(builder.dropTestFile(path.join(root, 'a.spec.ts'))).toBe(true);
    expect(builder.entries().map((e) => e.test.file)).toEqual(['b.spec.ts']);
    builder.clear();
    expect(builder.size).toBe(0);
  });

  it('ignores .actual and .diff files left over next to a passing comparison', async () => {
    const root = await tmpDir();
    writePng(path.join(root, 'a.actual.png'), 2, 2, 1);
    writePng(path.join(root, 'a.diff.png'), 2, 2, 2);
    writePng(path.join(root, 'a.png'), 2, 2, 3);
    const builder = builderIn(root);

    const passed = builder.record({
      actualPath: 'a.actual.png',
      baselinePath: 'a.png',
      status: 'passed',
      actualSize: { width: 2, height: 2 },
    });
    expect(passed.images.actual).toEqual({ path: null });
    expect(passed.images.diff).toEqual({ path: null });
    expect(Object.keys(passed.hashes ?? {})).toEqual(['baseline']);

    const failed = builder.record({
      actualPath: 'a.actual.png',
      baselinePath: 'a.png',
      status: 'failed',
    });
    expect(failed.images.actual.path).toBe('a.actual.png');
    expect(failed.images.diff.path).toBe('a.diff.png');
  });

  it('treats ./a.spec.ts and a.spec.ts as one test file', async () => {
    const root = await tmpDir();
    const builder = builderIn(root);
    const file = (testFile: string) =>
      builder.record({
        testFile,
        actualPath: 'a.png',
        baselinePath: 'a.png',
        status: 'passed',
      }).test.file;
    expect(file('./e2e/a.spec.ts')).toBe('e2e/a.spec.ts');
    expect(file('e2e//a.spec.ts')).toBe('e2e/a.spec.ts');
    expect(builder.dropTestFile('./e2e/a.spec.ts')).toBe(true);
  });

  it('serialises with the header first and the entries last', async () => {
    const root = await tmpDir();
    const builder = new ManifestBuilder({
      projectRoot: root,
      runner,
      ci: null,
      upload: { buildId: 'b', url: 'u', level: 'images' },
    });
    builder.record({
      actualPath: 'a.png',
      baselinePath: 'a.png',
      status: 'passed',
    });
    const json = builder.toJSON();
    expect(Object.keys(json)).toEqual([
      'version',
      'createdAt',
      'updatedAt',
      'projectRoot',
      'platform',
      'ci',
      'options',
      'runner',
      'upload',
      'entries',
    ]);
    expect(json.version).toBe(1);
    expect(json.entries).toHaveLength(1);
    expect(Object.keys(builderIn(root).toJSON())).not.toContain('upload');
  });
});
