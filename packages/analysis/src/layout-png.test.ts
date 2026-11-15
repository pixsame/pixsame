import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_VERSION,
  decodeLayout,
  encodeLayout,
  LAYOUT_KEYWORD,
  layoutVersionOf,
  readLayout,
  writeLayout,
  type Layout,
  type LayoutNode,
} from './index';
import { crc32 } from './layout/png';

const node = (
  tag: string,
  rect: [number, number, number, number],
  extra: Partial<LayoutNode> = {},
): LayoutNode => ({
  tag,
  rect,
  kids: [],
  ...extra,
});

const layout: Layout = {
  size: { width: 1280, height: 800 },
  scale: 2,
  count: 4,
  root: node('html', [0, 0, 1280, 800], {
    kids: [
      node('h1', [20.25, 10.5, 300.12, 40], {
        id: 'title',
        cls: 'big heading',
        text: 'Zażółć gęślą jaźń 你好 🙂',
        lines: [[20.25, 10.5, 300.12, 40]],
        paint: 'abc12',
        box: true,
      }),
      node('img', [20, 60.5, 100, 100], {
        media: true,
        scales: true,
        src: 'x1',
        box: true,
      }),
      node('div', [0, 0, 0, 0], { hidden: true }),
    ],
  }),
};

const chunk = (type: string, data: Uint8Array) => {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
};

/** A valid 2x1 grayscale PNG. */
const png = () => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(2, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr.set([8, 0, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('tEXt', Buffer.from('FRSOURCE_CPVRD_V\0{"version":"1"}')),
    chunk('IDAT', deflateSync(Buffer.from([0, 10, 200]))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

describe('layout encoding', () => {
  it('round-trips a snapshot without loss', () => {
    expect(decodeLayout(encodeLayout(layout))).toEqual(layout);
  });

  it('returns undefined for bytes that are not a layout', () => {
    expect(decodeLayout(Buffer.from('not a layout'))).toBeUndefined();
  });
});

describe('layout in a PNG', () => {
  it('stores the layout under a keyword that carries the analysis version', () => {
    expect(LAYOUT_KEYWORD).toBe(`pixsame-layout-v${ANALYSIS_VERSION}`);
    const stamped = writeLayout(png(), layout);
    expect(Buffer.from(stamped).includes(Buffer.from(LAYOUT_KEYWORD))).toBe(
      true,
    );
    expect(layoutVersionOf(stamped)).toBe(ANALYSIS_VERSION);
    expect(readLayout(stamped)).toEqual(layout);
  });

  it('keeps every other chunk and the image data', () => {
    const original = png();
    const stamped = Buffer.from(writeLayout(original, layout));
    expect(stamped.includes(Buffer.from('FRSOURCE_CPVRD_V'))).toBe(true);
    // the PNG minus the new chunk is the original
    const keyword = stamped.indexOf(LAYOUT_KEYWORD);
    const start = keyword - 8;
    const length = stamped.readUInt32BE(start);
    const rest = Buffer.concat([
      stamped.subarray(0, start),
      stamped.subarray(start + 12 + length),
    ]);
    expect(rest.equals(original)).toBe(true);
  });

  it('replaces an earlier layout instead of stacking them', () => {
    const once = writeLayout(png(), layout);
    const twice = writeLayout(once, { ...layout, scale: 1 });
    expect(
      Buffer.from(twice).toString('latin1').split('pixsame-layout').length - 1,
    ).toBe(1);
    expect(readLayout(twice)?.scale).toBe(1);
  });

  it('does not read a layout of another version, and writing drops it', () => {
    const stale = Buffer.from(writeLayout(png(), layout))
      .toString('latin1')
      .replace(LAYOUT_KEYWORD, `pixsame-layout-v${ANALYSIS_VERSION + 1}`);
    const bytes = Buffer.from(stale, 'latin1');
    expect(readLayout(bytes)).toBeUndefined();
    expect(layoutVersionOf(bytes)).toBe(ANALYSIS_VERSION + 1);
    const rewritten = writeLayout(bytes, layout);
    expect(layoutVersionOf(rewritten)).toBe(ANALYSIS_VERSION);
    expect(Buffer.from(rewritten).toString('latin1')).not.toContain(
      `v${ANALYSIS_VERSION + 1}`,
    );
  });

  it('leaves a PNG without a layout alone and bytes that are not a PNG unchanged', () => {
    expect(readLayout(png())).toBeUndefined();
    expect(layoutVersionOf(png())).toBeUndefined();
    const junk = Buffer.from('definitely not a png');
    expect(writeLayout(junk, layout)).toBe(junk);
    expect(readLayout(junk)).toBeUndefined();
  });
});
