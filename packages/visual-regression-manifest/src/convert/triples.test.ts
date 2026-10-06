import path from 'path';
import { describe, expect, it } from 'vitest';
import { tmpDir, writePng } from '../../__tests__/helpers';
import { isManifest } from '../reader';
import { fromImageTriples, inferStatus } from './triples';

describe('inferStatus', () => {
  it('reads the outcome off the files that exist', () => {
    expect(inferStatus({ baseline: true, actual: false })).toBe('passed');
    expect(inferStatus({ baseline: true, actual: true })).toBe('failed');
    expect(inferStatus({ baseline: false, actual: true })).toBe(
      'missing-baseline',
    );
    expect(inferStatus({ baseline: false, actual: false })).toBe(
      'missing-baseline',
    );
  });
});

describe('fromImageTriples', () => {
  it('builds a valid manifest from baselines and their siblings', async () => {
    const root = await tmpDir();
    writePng(path.join(root, 'shots', 'home.png'), 4, 3);
    writePng(path.join(root, 'shots', 'home.actual.png'), 4, 3, 1);
    writePng(path.join(root, 'shots', 'home.diff.png'), 4, 3, 2);
    writePng(path.join(root, 'shots', 'about.png'), 2, 2);
    writePng(path.join(root, 'shots', 'new.actual.png'), 1, 1);

    const manifest = fromImageTriples({
      projectRoot: root,
      runner: { name: 'my-tool', version: '2' },
      ci: null,
      triples: [
        {
          baseline: 'shots/home.png',
          testFile: 'e2e/home.spec.ts',
          titlePath: ['home'],
          diffRatio: 0.2,
          threshold: 0.1,
        },
        { baseline: path.join(root, 'shots', 'about.png') },
        { baseline: 'shots/new.png', message: 'no baseline yet' },
      ],
    });

    expect(isManifest(manifest)).toBe(true);
    expect(manifest.runner).toEqual({ name: 'my-tool', version: '2' });
    expect(manifest.entries).toMatchObject([
      {
        name: 'about',
        test: { file: '' },
        status: 'passed',
        images: {
          baseline: { path: 'shots/about.png', width: 2, height: 2 },
          actual: { path: null },
          diff: { path: null },
        },
        hashes: { baseline: expect.any(String) },
      },
      {
        name: 'new',
        status: 'missing-baseline',
        images: {
          baseline: { path: 'shots/new.png' },
          actual: { path: 'shots/new.actual.png', width: 1, height: 1 },
          diff: { path: null },
        },
        message: 'no baseline yet',
      },
      {
        name: 'home',
        test: { file: 'e2e/home.spec.ts', titlePath: ['home'] },
        status: 'failed',
        comparison: { diffRatio: 0.2, threshold: 0.1 },
        images: {
          baseline: { path: 'shots/home.png', width: 4, height: 3 },
          actual: { path: 'shots/home.actual.png', width: 4, height: 3 },
          diff: { path: 'shots/home.diff.png' },
        },
        hashes: {
          baseline: expect.any(String),
          actual: expect.any(String),
          diff: expect.any(String),
        },
      },
    ]);
    expect(manifest.entries[0]?.images.baseline).not.toHaveProperty('actual');
  });

  it('takes explicit paths, names and statuses over the conventions', async () => {
    const root = await tmpDir();
    writePng(path.join(root, 'expected', 'a.png'));
    writePng(path.join(root, 'out', 'a-received.png'));
    writePng(path.join(root, 'out', 'a-delta.png'));
    const manifest = fromImageTriples({
      projectRoot: root,
      runner: { name: 'other' },
      ci: null,
      triples: [
        {
          baseline: 'expected/a.png',
          actual: 'out/a-received.png',
          diff: 'out/a-delta.png',
          name: 'a (mobile)',
          status: 'updated',
          baselineWritten: true,
          retry: 1,
        },
        {
          baseline: 'expected/b.png',
          actual: 'out/b.png',
          diff: null,
          status: 'created',
        },
      ],
    });
    expect(manifest.entries.map((e) => e.name)).toEqual(['a (mobile)', 'b']);
    expect(manifest.entries[0]).toMatchObject({
      status: 'updated',
      baselineWritten: true,
      test: { retry: 1 },
      images: {
        actual: { path: 'out/a-received.png' },
        diff: { path: 'out/a-delta.png' },
      },
    });
    expect(manifest.entries[1]).toMatchObject({
      status: 'created',
      images: { actual: { path: null }, diff: { path: null } },
    });
  });
});
