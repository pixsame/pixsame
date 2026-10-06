import { describe, expect, it } from 'vitest';
import type { ManifestEntry } from './types';
import {
  entry,
  HEAD_SHA,
  manifest,
  must,
  OTHER_SHA,
} from '../__tests__/helpers';
import {
  countByStatus,
  entryKey,
  keyHash,
  mergeManifests,
  platformLabel,
  rendererLabel,
  selectEntries,
  type ManifestSource,
} from './merge';

type Source = ManifestSource & { artifactId: number };

const source = (m = manifest(), overrides: Partial<Source> = {}): Source => ({
  artifactId: 9,
  label: 'test:cypress/screenshots/visual-regression-manifest.e2e.json',
  manifest: m,
  ...overrides,
});

describe('entryKey', () => {
  it('distinguishes platforms and is stable', () => {
    const a = entry();
    const b = entry({
      platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
    });
    expect(entryKey(a)).not.toBe(entryKey(b));
    expect(keyHash(entryKey(a))).toMatch(/^[0-9a-f]{12}$/);
    expect(platformLabel(a)).toBe('linux / electron');
    expect(platformLabel(entry({ platform: undefined }))).toBe('');
  });

  it('tells renderers apart, except the native one which is the test browser', () => {
    const native = entry({
      renderer: { backend: 'native', browser: 'electron' },
    });
    const docker = entry({
      renderer: { backend: 'docker', browser: 'chromium' },
    });
    const dockerFirefox = entry({
      renderer: { backend: 'docker', browser: 'firefox' },
    });
    expect(entryKey(native)).toBe(entryKey(entry({ renderer: undefined })));
    expect(entryKey(docker)).not.toBe(entryKey(native));
    expect(entryKey(docker)).not.toBe(entryKey(dockerFirefox));
    expect(platformLabel(native)).toBe('linux / electron');
    expect(platformLabel(docker)).toBe('linux / electron (docker chromium)');
    expect(
      platformLabel(entry({ platform: undefined, renderer: docker.renderer })),
    ).toBe('docker chromium');
  });
});

describe('mergeManifests', () => {
  it('merges entries across sources, later attempts winning, and keeps the source object', () => {
    const first = manifest([entry({ status: 'failed' })]);
    const retried = manifest([entry({ status: 'passed' })], {
      ci: { ...must(manifest().ci), runAttempt: '2' },
    });
    const other = manifest(
      [
        entry({
          name: 'about_#0',
          platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
        }),
      ],
      { ci: null },
    );
    const run = mergeManifests(
      [
        source(retried, { artifactId: 10 }),
        source(first),
        source(other, { artifactId: 11 }),
      ],
      { headSha: HEAD_SHA, runId: 555, repository: 'o/r' },
    );
    expect(
      run.entries.map((e) => [e.entry.name, e.entry.status, e.runAttempt]),
    ).toEqual([
      ['about_#0', 'failed', 1],
      ['home_#0', 'passed', 2],
    ]);
    expect(run.entries.map((e) => e.source.artifactId)).toEqual([11, 10]);
    expect(run.counts).toEqual({
      passed: 1,
      failed: 1,
      'missing-baseline': 0,
      created: 0,
      updated: 0,
      approved: 0,
    });
    expect(run.needsHuman.map((e) => e.entry.name)).toEqual(['about_#0']);
    expect(run.warnings).toEqual([]);
    expect(run.sources).toHaveLength(3);
    expect(run.entries[1]?.repoPaths).toEqual({
      baseline: 'cypress/e2e/__image_snapshots__/home_#0.png',
      actual: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      diff: 'cypress/e2e/__image_snapshots__/home_#0.diff.png',
    });
  });

  it('warns when the manifest does not match the run, naming the source', () => {
    const m = manifest([], {
      ci: {
        ...must(manifest().ci),
        pullRequest: { number: 7, headSha: OTHER_SHA },
        runId: '1',
        repository: 'x/y',
      },
    });
    const { warnings } = mergeManifests([source(m), { manifest: m }], {
      headSha: HEAD_SHA,
      runId: '555',
      repository: 'o/r',
    });
    expect(warnings).toHaveLength(6);
    expect(warnings[0]).toMatch(/^test:cypress.*written for commit bbbbbbb/);
    expect(warnings[3]).toMatch(/^manifest #2: /);
  });

  it('warns when screenshots fell back to the local browser', () => {
    const m = manifest([
      entry({
        renderer: { backend: 'native', browser: 'electron', fallback: true },
      }),
      entry({
        name: 'about_#0',
        renderer: { backend: 'native', browser: 'electron' },
      }),
    ]);
    const { warnings } = mergeManifests([source(m)]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /1 screenshot was rendered by the local browser .*renderer\.fallback/,
    );
    expect(mergeManifests([source(manifest())]).warnings).toEqual([]);
  });

  it('marks entries that cannot be approved from CI', () => {
    const outside = manifest([
      entry({
        images: { ...entry().images, baseline: { path: '../../outside.png' } },
      }),
    ]);
    const noActual = manifest([
      entry({ images: { ...entry().images, actual: { path: null } } }),
    ]);
    const actualOutside = manifest([
      entry({ images: { ...entry().images, actual: { path: '../../a.png' } } }),
    ]);
    const badProject = manifest([entry()], { projectRoot: '/other/place' });
    expect(
      mergeManifests([source(outside)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/outside the repository/);
    expect(
      mergeManifests([source(noActual)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/kept no actual/);
    expect(
      mergeManifests([source(actualOutside)]).needsHuman[0]?.unapprovableReason,
    ).toMatch(/actual path .* outside/);
    const run = mergeManifests([source(badProject)]);
    expect(run.warnings.some((w) => w.includes('outside the checkout'))).toBe(
      true,
    );
    expect(run.entries[0]?.repoPaths).toEqual({
      baseline: null,
      actual: null,
      diff: null,
    });
    expect(
      mergeManifests([source(manifest([entry({ status: 'passed' })]))])
        .entries[0]?.unapprovableReason,
    ).toBeUndefined();
  });

  it('detects two platforms writing the same baseline', () => {
    const linux = entry();
    const mac = entry({
      platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
    });
    const run = mergeManifests([source(manifest([linux, mac]))]);
    expect(run.needsHuman).toHaveLength(2);
    expect(run.needsHuman[0]?.collidesWith).toEqual([
      run.needsHuman[1]?.keyHash,
    ]);
  });

  it('counts statuses', () => {
    expect(
      countByStatus([entry(), entry({ status: 'created' })]),
    ).toMatchObject({ failed: 1, created: 1 });
  });
});

describe('selectEntries', () => {
  const run = mergeManifests([
    source(
      manifest([
        entry(),
        entry({ name: 'about_#0' }),
        entry({
          name: 'about_#0',
          platform: { os: 'darwin', browser: { name: 'chrome', version: '1' } },
        }),
      ]),
    ),
  ]);

  it('selects everything that needs a human', () => {
    expect(selectEntries(run, 'all').entries).toHaveLength(3);
  });

  it('selects by key hash and reports unknown hashes', () => {
    const hash = must(run.entries[0]).keyHash;
    expect(
      selectEntries(run, { keyHashes: [hash, 'ffffffffffff'] }),
    ).toMatchObject({
      entries: [run.entries[0]],
      unknown: ['ffffffffffff'],
    });
  });

  it('selects by name, including the platform-suffixed form', () => {
    const byName = selectEntries(run, { names: ['about_#0', 'nope'] });
    expect(byName.entries).toHaveLength(2);
    expect(byName.unknown).toEqual(['nope']);
    expect(
      selectEntries(run, { names: ['about_#0 (darwin / chrome)'] }).entries,
    ).toHaveLength(1);
  });
});

describe('producer-chosen variant', () => {
  const base = {
    name: 'home',
    test: { file: '', titlePath: [], retry: 0 },
    status: 'passed',
    comparison: { diffRatio: 0, threshold: 0 },
    images: {
      baseline: { path: 'home.png' },
      actual: { path: null },
      diff: { path: null },
    },
    baselineWritten: false,
    recordedAt: '2026-01-01T00:00:00.000Z',
    message: '',
  } as const;

  it('keeps entries of one screenshot on different variants apart', () => {
    const a = { ...base, platform: { os: 'ios' }, variant: 'iphone-se' };
    const b = { ...base, platform: { os: 'ios' }, variant: 'iphone-16' };
    expect(entryKey(a)).not.toBe(entryKey(b));
    expect(platformLabel(a)).toBe('ios / iphone-se');
  });

  it('falls back to os and browser without a variant, and works without a browser', () => {
    const entry = { ...base, platform: { os: 'macos' } };
    expect(entryKey(entry)).toBe(entryKey({ ...entry }));
    expect(platformLabel(entry)).toBe('macos');
    expect(
      rendererLabel({
        ...entry,
        renderer: { backend: 'device', name: 'iPhone 16' },
      }),
    ).toBe('device iPhone 16');
  });
});

describe('same screenshot reported twice', () => {
  const failed = entry({ status: 'failed' });
  const passed = entry({
    status: 'passed',
    images: { ...entry().images, actual: { path: null } },
  });
  const run = (attempt: string) =>
    manifest([], { ci: { ...must(manifest().ci), runAttempt: attempt } });
  const withEntries = (entries: ManifestEntry[], attempt = '1') => ({
    manifest: { ...run(attempt), entries },
  });

  it('warns when the same attempt gives one identity two different results', () => {
    const { warnings, entries } = mergeManifests([
      { ...withEntries([failed]), label: 'worker 1' },
      { ...withEntries([passed]), label: 'worker 2' },
    ]);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.entry.status).toBe('passed');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(
      /^worker 2: `home_#0`.*also reported by worker 1.*distinct `variant`/,
    );
  });

  it('stays quiet for an identical duplicate and for a re-run attempt', () => {
    expect(
      mergeManifests([withEntries([failed]), withEntries([failed])]).warnings,
    ).toEqual([]);
    expect(
      mergeManifests([withEntries([failed]), withEntries([passed], '2')])
        .warnings,
    ).toEqual([]);
  });

  it('stays quiet when a variant tells them apart', () => {
    const { warnings, entries } = mergeManifests([
      withEntries([{ ...failed, variant: 'a' }]),
      withEntries([{ ...passed, variant: 'b' }]),
    ]);
    expect(warnings).toEqual([]);
    expect(entries).toHaveLength(2);
  });
});
