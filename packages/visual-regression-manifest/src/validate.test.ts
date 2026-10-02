import { describe, expect, it } from 'vitest';
import Ajv from 'ajv/dist/2020';
import { entry, manifest } from '../__tests__/helpers';
import schema from './schema.json';
import { validateAgainst, type JsonSchema } from './validate';

const ajv = new Ajv({ allErrors: true, validateFormats: false });
const ajvValidate = ajv.compile(schema);

const agreesWithAjv = (value: unknown) => {
  const ours = validateAgainst(schema as JsonSchema, value);
  const theirs = ajvValidate(value);
  expect(
    ours.length === 0,
    `ours: ${JSON.stringify(ours)}\najv: ${JSON.stringify(ajvValidate.errors)}`,
  ).toBe(theirs);
  return ours;
};

const withEntry = (overrides: object) =>
  manifest([{ ...entry(), ...overrides } as never]);

describe('validateAgainst (cross-checked with Ajv)', () => {
  it('accepts a full manifest, a minimal one, and unknown keys', () => {
    expect(agreesWithAjv(manifest())).toEqual([]);
    expect(
      agreesWithAjv(
        manifest([], {
          ci: null,
          options: {},
          runner: { name: 'x' },
          platform: { os: 'linux', arch: 'x64' },
        }),
      ),
    ).toEqual([]);
    expect(agreesWithAjv({ ...manifest(), extra: 1 })).toEqual([]);
    expect(
      agreesWithAjv(withEntry({ future: true, platform: undefined })),
    ).toEqual([]);
    expect(
      agreesWithAjv(
        manifest([], {
          ci: { provider: null },
          upload: { buildId: 'b', url: 'u', level: 'images' },
        }),
      ),
    ).toEqual([]);
    expect(
      agreesWithAjv(
        manifest([], { runner: { name: 'pw', specPattern: ['a'] } }),
      ),
    ).toEqual([]);
  });

  it('rejects broken documents the same way Ajv does', () => {
    expect(agreesWithAjv('nope')).toEqual([
      { path: '(root)', message: 'expected object, got "nope"' },
    ]);
    expect(agreesWithAjv(null)).toHaveLength(1);
    expect(agreesWithAjv({ ...manifest(), version: 2 })).toEqual([
      { path: 'version', message: 'expected 1, got 2' },
    ]);
    expect(agreesWithAjv({ ...manifest(), entries: {} })).toEqual([
      { path: 'entries', message: 'expected array, got object' },
    ]);
    expect(agreesWithAjv({ ...manifest(), projectRoot: '' })).toEqual([
      { path: 'projectRoot', message: 'must not be empty' },
    ]);
    const noEntries: Partial<ReturnType<typeof manifest>> = manifest();
    delete noEntries.entries;
    expect(agreesWithAjv(noEntries)).toEqual([
      { path: 'entries', message: 'is required' },
    ]);
  });

  it('checks the ci block including its nullable pull request', () => {
    expect(
      agreesWithAjv(manifest([], { ci: { provider: 5 } as never })),
    ).toEqual([
      {
        path: 'ci.provider',
        message: 'expected string or null, got 5',
      },
    ]);
    expect(
      agreesWithAjv(
        manifest([], { ci: { provider: 'github', pullRequest: null } }),
      ),
    ).toEqual([]);
    expect(
      agreesWithAjv(
        manifest([], {
          ci: { provider: 'github', pullRequest: { number: 0 } },
        }),
      ),
    ).toEqual([{ path: 'ci.pullRequest.number', message: 'must be >= 1' }]);
    expect(
      agreesWithAjv(
        manifest([], { ci: { provider: 'github', pullRequest: 7 } as never }),
      ),
    ).toEqual([
      {
        path: 'ci.pullRequest',
        message: 'does not match any allowed shape, got 7',
      },
    ]);
    expect(agreesWithAjv(manifest([], { ci: 'yes' as never }))).toEqual([
      { path: 'ci', message: 'does not match any allowed shape, got "yes"' },
    ]);
  });

  it('checks entries field by field', () => {
    expect(agreesWithAjv(withEntry({ status: 'weird' }))).toEqual([
      {
        path: 'entries.0.status',
        message:
          'expected one of "passed", "failed", "missing-baseline", "created", "updated", "approved", got "weird"',
      },
    ]);
    expect(
      agreesWithAjv(withEntry({ comparison: { diffRatio: 2, threshold: 0 } })),
    ).toEqual([
      { path: 'entries.0.comparison.diffRatio', message: 'must be <= 1' },
    ]);
    expect(
      agreesWithAjv(
        withEntry({ images: { ...entry().images, baseline: { path: null } } }),
      ),
    ).toEqual([
      {
        path: 'entries.0.images.baseline.path',
        message: 'expected string, got null',
      },
    ]);
    expect(
      agreesWithAjv(
        withEntry({ test: { file: 'a', titlePath: 'b', retry: 0 } }),
      ),
    ).toEqual([
      { path: 'entries.0.test.titlePath', message: 'expected array, got "b"' },
    ]);
    expect(
      agreesWithAjv(
        withEntry({ test: { file: 'a', titlePath: [], retry: 1.5 } }),
      ),
    ).toEqual([
      { path: 'entries.0.test.retry', message: 'expected integer, got 1.5' },
    ]);
    expect(agreesWithAjv(withEntry({ hashes: { actual: 'abc' } }))).toEqual([
      {
        path: 'entries.0.hashes.actual',
        message: 'must match ^[0-9a-f]{64}$',
      },
    ]);
    expect(
      agreesWithAjv(withEntry({ renderer: { backend: 7, browser: 'x' } })),
    ).toEqual([
      {
        path: 'entries.0.renderer.backend',
        message: 'expected string, got 7',
      },
    ]);
    // non-browser producers: no browser anywhere, any backend
    expect(
      agreesWithAjv(
        withEntry({
          platform: { os: 'ios', osVersion: '18.2' },
          renderer: { backend: 'device', name: 'iPhone 16' },
          target: {
            kind: 'mobile',
            device: { model: 'iPhone 16' },
            display: { density: 3, orientation: 'portrait' },
          },
          variant: 'iphone16-ios18-light',
        }),
      ),
    ).toEqual([]);
    expect(
      agreesWithAjv(
        withEntry({
          options: {
            imagesPath: 'x',
            maxDiffThreshold: 0.1,
            diffConfig: {},
            createMissingImages: true,
            updateImages: 'always',
            forceDeviceScaleFactor: true,
            screenshotConfig: {},
          },
        }),
      ),
    ).toEqual([
      {
        path: 'entries.0.options.updateImages',
        message: 'does not match any allowed shape, got "always"',
      },
    ]);
    expect(
      agreesWithAjv(withEntry({ platform: { arch: 'x64' } as never })),
    ).toEqual([{ path: 'entries.0.platform.os', message: 'is required' }]);
    expect(agreesWithAjv({ ...manifest(), createdAt: 'yesterday' })).toEqual([
      {
        path: 'createdAt',
        message: expect.stringContaining('must match'),
      },
    ]);
    expect(agreesWithAjv(withEntry({ name: '', message: 5 }))).toEqual([
      { path: 'entries.0.name', message: 'must not be empty' },
      { path: 'entries.0.message', message: 'expected string, got 5' },
    ]);
  });

  it('reports several issues at once', () => {
    const issues = agreesWithAjv({
      ...manifest(),
      createdAt: 1,
      runner: {},
      entries: [{}],
    });
    expect(issues.map((i) => i.path)).toEqual([
      'createdAt',
      'runner.name',
      'entries.0.name',
      'entries.0.test',
      'entries.0.status',
      'entries.0.comparison',
      'entries.0.images',
      'entries.0.baselineWritten',
      'entries.0.recordedAt',
      'entries.0.message',
    ]);
  });

  it('refuses $refs it cannot resolve', () => {
    expect(() =>
      validateAgainst({ $ref: 'https://example.com/other.json' }, {}),
    ).toThrow(/Unsupported \$ref/);
  });
});
