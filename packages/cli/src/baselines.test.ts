import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeLayout, type Layout } from '@pixsame/analysis';
import { findBaselines } from './baselines';
import { run } from './cli';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (bytes: Buffer) => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc(body), out.length - 4);
  return out;
};
/** A valid 1x1 PNG, optionally with a text chunk. */
const png = (text?: string) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(1, 0);
  header.writeUInt32BE(1, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    ...(text ? [chunk('tEXt', Buffer.from(`${text}\0v`))] : []),
    chunk('IDAT', deflateSync(Buffer.from([0, 1, 2, 3, 4]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

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

describe('run', () => {
  const lines = () => {
    const out: string[] = [];
    return { out, push: (line: string) => void out.push(line) };
  };

  it('lists what lacks a layout and exits 0, or 1 with --check', async () => {
    await put('snapshots/a.png', png());
    const first = lines();
    expect(await run(['baselines'], first.push, dir)).toBe(0);
    expect(first.out.join('\n')).toContain(
      '1 of 1 baselines lack the page layout',
    );
    expect(first.out.join('\n')).toContain('no layout');
    expect(await run(['baselines', '--check'], lines().push, dir)).toBe(1);
  });

  it('exits 0 with --check when every baseline has one', async () => {
    await put('snapshots/a.png', writeLayout(png(), layout));
    const result = lines();
    expect(await run(['baselines', '--check'], result.push, dir)).toBe(0);
    expect(result.out[0]).toMatch(/^All 1 baselines have the page layout/);
  });

  it('prints JSON', async () => {
    await put('snapshots/a.png', png());
    const result = lines();
    await run(['baselines', '--json'], result.push, dir);
    expect(JSON.parse(result.out[0]).counts.missing).toBe(1);
  });

  it('says so when there are no baselines', async () => {
    const result = lines();
    await run(['baselines'], result.push, dir);
    expect(result.out[0]).toBe('No baselines found.');
  });

  it('shows help, and fails on an unknown command or option', async () => {
    expect(await run([], lines().push, dir)).toBe(0);
    expect(await run(['bogus'], lines().push, dir)).toBe(1);
    expect(await run(['baselines', '--bogus'], lines().push, dir)).toBe(1);
  });
});
