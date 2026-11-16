import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeLayout, type Layout } from '@pixsame/analysis';
import { findBaselines } from './baselines';
import { png } from './test-utils';

const layout: Layout = {
  size: { width: 10, height: 10 },
  scale: 1,
  count: 1,
  root: { tag: 'html', rect: [0, 0, 10, 10], kids: [] },
};

let dir: string;
const put = async (file: string, bytes: Uint8Array) => {
  await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
  await writeFile(path.join(dir, file), bytes);
};

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pixsame-cli-'));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe('findBaselines', () => {
  it('tells current, outdated and missing layouts apart', async () => {
    await put('a/current.png', writeLayout(png('FRSOURCE_CPVRD_V'), layout));
    await put('a/missing.png', png('FRSOURCE_CPVRD_V'));
    const outdated = Buffer.from(writeLayout(png(), layout));
    // rename the chunk keyword to another version, then fix nothing else: the version is read from the keyword
    await put(
      'a/outdated.png',
      Buffer.from(
        outdated.toString('latin1').replace('layout-v1', 'layout-v0'),
        'latin1',
      ),
    );
    const report = await findBaselines(['.'], dir);
    expect(report.baselines.map(({ file, status }) => [file, status])).toEqual([
      [path.join('a', 'current.png'), 'current'],
      [path.join('a', 'missing.png'), 'missing'],
      [path.join('a', 'outdated.png'), 'outdated'],
    ]);
    expect(report.counts).toEqual({ current: 1, outdated: 1, missing: 1 });
  });

  it('only counts PNGs that are baselines', async () => {
    await put('logo.png', png());
    await put('cypress/snapshots/a.cy.ts/home.png', png());
    await put('tests/x.spec.ts-snapshots/page-chromium-linux.png', png());
    await put('cypress/snapshots/a.cy.ts/home.actual.png', png());
    await put('cypress/snapshots/a.cy.ts/home.diff.png', png());
    await put('node_modules/pkg/snapshots/x.png', png());
    const files = (await findBaselines(['.'], dir)).baselines.map(
      (b) => b.file,
    );
    expect(files).toEqual([
      path.join('cypress', 'snapshots', 'a.cy.ts', 'home.png'),
      path.join('tests', 'x.spec.ts-snapshots', 'page-chromium-linux.png'),
    ]);
  });

  it('copes with a folder that does not exist', async () => {
    expect((await findBaselines(['nope'], dir)).baselines).toEqual([]);
  });
});
