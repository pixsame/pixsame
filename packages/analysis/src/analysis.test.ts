import { describe, expect, it } from 'vitest';
import {
  analysisPlugin,
  analyze,
  bundle,
  captureComparison,
  detectShift,
  findRegions,
  maskFromPixelmatchDiff,
  regionHash,
  withAnalysis,
} from './index';
import { clone, image, maskOf, page, paint } from './test-utils';
import type { RgbaImage } from './types';

const analyzePair = (baseline: RgbaImage, actual: RgbaImage) =>
  analyze({ baseline, actual, mask: maskOf(baseline, actual) });

describe('findRegions', () => {
  it('finds one block with its exact box and pixel count', () => {
    const before = image(200, 100);
    const after = paint(
      clone(before),
      { x: 40, y: 20, width: 50, height: 30 },
      [0, 0, 0],
    );
    const { regions, diffPixels, truncated } = findRegions(
      maskOf(before, after),
      200,
      100,
    );
    expect(truncated).toBeUndefined();
    expect(diffPixels).toBe(1500);
    expect(regions).toEqual([
      {
        x: 40,
        y: 20,
        width: 50,
        height: 30,
        area: 1500,
        fillRatio: 1,
        kind: 'block',
      },
    ]);
  });

  it('keeps distant changes apart and joins near ones', () => {
    const before = image(200, 100);
    const after = clone(before);
    // two letters of one word, 3 px apart
    paint(after, { x: 20, y: 20, width: 6, height: 10 }, [0, 0, 0]);
    paint(after, { x: 29, y: 20, width: 6, height: 10 }, [0, 0, 0]);
    // something else, far away
    paint(after, { x: 150, y: 70, width: 20, height: 10 }, [0, 0, 0]);
    const { regions } = findRegions(maskOf(before, after), 200, 100);
    expect(
      regions.map(({ x, y, width, height }) => [x, y, width, height]),
    ).toEqual([
      [150, 70, 20, 10],
      [20, 20, 15, 10],
    ]);
  });

  it('names specks and bands', () => {
    const before = image(200, 100);
    const after = clone(before);
    paint(after, { x: 100, y: 50, width: 2, height: 2 }, [0, 0, 0]);
    paint(after, { x: 0, y: 90, width: 200, height: 3 }, [0, 0, 0]);
    const { regions } = findRegions(maskOf(before, after), 200, 100);
    expect(regions.map((region) => region.kind)).toEqual(['band', 'speck']);
  });

  it('sums up what does not fit', () => {
    const before = image(400, 20);
    const after = clone(before);
    for (let i = 0; i < 8; i++) {
      paint(after, { x: i * 48, y: 4, width: 1 + i, height: 1 }, [0, 0, 0]);
    }
    const { regions, truncated } = findRegions(maskOf(before, after), 400, 20, {
      maxRegions: 3,
    });
    expect(regions.map((region) => region.area)).toEqual([8, 7, 6]);
    expect(truncated).toEqual({ count: 5, area: 15 });
  });
});

describe('maskFromPixelmatchDiff', () => {
  it('reads the pixels painted with the diff colors', () => {
    const diff = image(4, 1, [240, 240, 240]);
    paint(diff, { x: 1, y: 0, width: 1, height: 1 }, [255, 0, 0]);
    paint(diff, { x: 2, y: 0, width: 1, height: 1 }, [255, 255, 0]);
    paint(diff, { x: 3, y: 0, width: 1, height: 1 }, [0, 255, 0]);
    expect([...maskFromPixelmatchDiff(diff)]).toEqual([0, 1, 0, 0]);
    expect([
      ...maskFromPixelmatchDiff(diff, { diffColorAlt: [0, 255, 0] }),
    ]).toEqual([0, 1, 0, 1]);
  });
});

describe('detectShift', () => {
  const shiftedDown = (source: RgbaImage, fromY: number, by: number) => {
    const target = clone(source);
    const stride = source.width * 4;
    for (let y = source.height - 1; y >= fromY + by; y--) {
      target.data.set(
        source.data.subarray((y - by) * stride, (y - by + 1) * stride),
        y * stride,
      );
    }
    paint(
      target,
      { x: 0, y: fromY, width: source.width, height: by },
      [200, 30, 30],
    );
    return target;
  };

  it('finds content moved down', () => {
    const before = page();
    const shift = detectShift(before, shiftedDown(before, 60, 12));
    expect(shift).toMatchObject({ fromX: 0, fromY: 60, dx: 0, dy: 12 });
    expect(shift?.coverage).toBeGreaterThan(0.9);
  });

  it('finds content moved up', () => {
    const after = page();
    const before = shiftedDown(after, 60, 12);
    expect(detectShift(before, after)).toMatchObject({ fromY: 60, dy: -12 });
  });

  it('finds none for a change in place, even on a mostly blank page', () => {
    const before = image(200, 300);
    const after = paint(
      clone(before),
      { x: 20, y: 40, width: 80, height: 30 },
      [0, 0, 0],
    );
    expect(detectShift(before, after)).toBeNull();
    expect(detectShift(before, before)).toBeNull();
  });
});

describe('moves sideways and of single areas', () => {
  it('finds everything right of a column moved right', () => {
    const before = image(300, 120);
    for (let i = 0; i < 10; i++) {
      paint(
        before,
        { x: 12 + i * 27, y: 10 + ((i * 17) % 60), width: 14, height: 30 + i },
        [(i * 53) % 256, (i * 97) % 256, (i * 31) % 256],
      );
    }
    const after = clone(before);
    for (let y = 0; y < before.height; y++) {
      const row = y * before.width * 4;
      after.data.copyWithin(row + (100 + 9) * 4, row + 100 * 4, row + 291 * 4);
    }
    expect(detectShift(before, after)).toMatchObject({
      fromY: 0,
      dx: 9,
      dy: 0,
    });
    expect(analyzePair(before, after).description).toMatch(
      /^Everything right of x=\d+ moved right by 9 px\.$/,
    );
  });

  const badge = (target: RgbaImage, x: number, y: number) => {
    paint(target, { x, y, width: 40, height: 16 }, [20, 90, 200]);
    paint(
      target,
      { x: x + 4, y: y + 4, width: 10, height: 8 },
      [255, 255, 255],
    );
    paint(target, { x: x + 22, y: y + 3, width: 12, height: 5 }, [250, 200, 0]);
    return target;
  };

  it('finds one area that moved while the rest stayed', () => {
    const before = badge(page(), 130, 250);
    const after = badge(page(), 142, 250);
    const analysis = analyzePair(before, after);
    expect(analysis.shift).toBeNull();
    expect(analysis.regions[0]).toMatchObject({
      x: 130,
      y: 250,
      width: 52,
      height: 16,
      moved: { dx: 12, dy: 0 },
    });
    expect(analysis).toMatchObject({
      label: 'moved',
      description: 'One area moved right by 12 px: 52x16 px at x=130, y=250.',
    });
    expect(analysis.bundleKey).toMatch(/^moved-area:12,0:52x16:/);
  });

  it('describes areas that moved in different ways', () => {
    const before = badge(badge(page(300, 300), 130, 250), 240, 40);
    const after = badge(badge(page(300, 300), 130, 243), 251, 40);
    const analysis = analyzePair(before, after);
    expect(analysis.regions.map((region) => region.moved)).toEqual([
      { dx: 0, dy: -7 },
      { dx: 11, dy: 0 },
    ]);
    expect(analysis.description).toBe(
      '2 areas moved. The largest is 40x23 px at x=130, y=243.',
    );
  });

  it('does not call a change next to a move a move', () => {
    const before = badge(page(300, 300), 130, 250);
    const after = paint(
      badge(page(300, 300), 142, 250),
      { x: 240, y: 40, width: 30, height: 30 },
      [0, 0, 0],
    );
    const analysis = analyzePair(before, after);
    expect(analysis.label).toBe('content-change');
    expect(analysis.regions.map((region) => !!region.moved)).toEqual([
      false,
      true,
    ]);
  });
});

describe('regionHash', () => {
  it('is the same for the same pixels elsewhere and differs for other pixels', () => {
    const a = image(200, 100);
    const b = image(300, 200);
    const draw = (target: RgbaImage, x: number, y: number) => {
      paint(target, { x: x + 20, y, width: 20, height: 20 }, [0, 0, 0]);
      paint(target, { x, y, width: 20, height: 10 }, [90, 90, 90]);
    };
    draw(a, 10, 10);
    draw(b, 120, 90);
    const box = { width: 40, height: 20 };
    expect(regionHash(a, { x: 10, y: 10, ...box })).toBe(
      regionHash(b, { x: 120, y: 90, ...box }),
    );
    expect(regionHash(a, { x: 10, y: 10, ...box })).not.toBe(
      regionHash(a, { x: 100, y: 60, ...box }),
    );
  });
});

describe('analyze', () => {
  it('describes a changed area', () => {
    const before = page();
    const after = paint(
      clone(before),
      { x: 120, y: 200, width: 50, height: 30 },
      [0, 0, 0],
    );
    const analysis = analyzePair(before, after);
    expect(analysis).toMatchObject({
      version: 1,
      label: 'content-change',
      description: 'One area changed: 50x30 px at x=120, y=200.',
      shift: null,
      speckRatio: 0,
    });
    expect(analysis.bundleKey).toMatch(/^change:50x30:[0-9a-f]{16}$/);
  });

  it('counts the areas when there are several', () => {
    const before = image(200, 100);
    const after = clone(before);
    paint(after, { x: 10, y: 10, width: 30, height: 20 }, [0, 0, 0]);
    paint(after, { x: 150, y: 70, width: 10, height: 10 }, [0, 0, 0]);
    expect(analyzePair(before, after).description).toBe(
      '2 areas changed. The largest is 30x20 px at x=10, y=10.',
    );
  });

  it('calls scattered specks noise', () => {
    const before = page();
    const after = clone(before);
    for (let i = 0; i < 20; i++) {
      paint(
        after,
        { x: (i * 37) % 190, y: (i * 61) % 290, width: 1, height: 1 },
        [1, 2, 3],
      );
    }
    expect(analyzePair(before, after)).toMatchObject({
      label: 'noise-like',
      description:
        '20 pixels differ in tiny scattered spots, which looks like rendering noise.',
      bundleKey: 'noise',
    });
  });

  it('describes a move', () => {
    const before = page();
    const after = clone(before);
    const stride = before.width * 4;
    // rows 100..109 lie inside one block, so the first row that looks different is 110
    after.data.copyWithin(100 * stride + 5 * stride, 100 * stride);
    expect(analyzePair(before, after)).toMatchObject({
      label: 'moved',
      description: 'Everything below y=110 moved down by 5 px.',
      bundleKey: 'moved:0,5',
    });
  });

  it('describes a size change first and takes other words', () => {
    const before = image(100, 100);
    const after = paint(
      clone(before),
      { x: 0, y: 50, width: 100, height: 50 },
      [0, 0, 255],
    );
    const sizes = {
      baseline: { width: 100, height: 50 },
      actual: { width: 100, height: 100 },
    };
    const mask = maskOf(before, after);
    expect(
      analyze({ baseline: before, actual: after, mask, sizes }),
    ).toMatchObject({
      label: 'size-change',
      description: 'The screenshot is 50 px taller than the baseline.',
      sizes,
    });
    expect(
      analyze({
        baseline: before,
        actual: after,
        mask,
        sizes,
        descriptions: { 'size-change': () => 'Rozmiar się zmienił.' },
      }).description,
    ).toBe('Rozmiar się zmienił.');
  });
});

describe('bundle', () => {
  it('groups entries that changed in the same way', () => {
    const header = (width: number, height: number, changed: boolean) => {
      const target = page(width, height);
      if (changed) {
        paint(target, { x: 100, y: 0, width: 60, height: 8 }, [10, 120, 10]);
      }
      return target;
    };
    const entry = (name: string, baseline: RgbaImage, actual: RgbaImage) => ({
      name,
      extra: { pixsame: { analysis: analyzePair(baseline, actual) } },
    });
    const other = paint(
      page(),
      { x: 20, y: 250, width: 30, height: 30 },
      [0, 0, 0],
    );
    const bundles = bundle([
      entry('other', page(), other),
      entry('home', header(200, 300, false), header(200, 300, true)),
      entry('cart', header(240, 400, false), header(240, 400, true)),
      { name: 'passed' },
    ]);
    expect(bundles.map(({ entries }) => entries)).toEqual([
      ['home', 'cart'],
      ['other'],
    ]);
    expect(bundles[0]).toMatchObject({ label: 'content-change' });
  });
});

describe('analysisPlugin', () => {
  type Hook = (
    ctx: { input: { extra?: Record<string, Record<string, unknown>> } },
    measurement: Record<string, unknown>,
  ) => void;
  type Decide = <D extends { status: string; message: string }>(
    ctx: unknown,
    decision: D,
  ) => D;
  const hooksOf = () => {
    const hooks: Record<string, unknown> = {};
    analysisPlugin().setup({
      on: (event: string, fn: unknown) => {
        hooks[event] = fn;
      },
    });
    return {
      afterCompare: hooks.afterCompare as Hook,
      decide: hooks.decide as Decide,
    };
  };
  const hookOf = () => hooksOf().afterCompare;
  const before = image(40, 40);
  const after = paint(
    clone(before),
    { x: 8, y: 8, width: 16, height: 16 },
    [0, 0, 0],
  );
  const diff = paint(
    image(40, 40, [240, 240, 240]),
    { x: 8, y: 8, width: 16, height: 16 },
    [255, 0, 0],
  );
  const measurement = {
    kind: 'compared',
    baselineSize: { width: 40, height: 40 },
    actualSize: { width: 40, height: 40 },
    result: { diffPixels: 256 },
  };

  it('writes the analysis of the comparison to the entry', async () => {
    const hook = hookOf();
    const ctx = { input: { extra: { other: { kept: true } } } } as {
      input: { extra?: Record<string, Record<string, unknown>> };
    };
    await withAnalysis(async () => {
      captureComparison(before, after, diff);
      hook(ctx, measurement);
    });
    expect(ctx.input.extra?.other).toEqual({ kept: true });
    expect(ctx.input.extra?.pixsame.analysis).toMatchObject({
      label: 'content-change',
      description: 'One area changed: 16x16 px at x=8, y=8.',
    });
  });

  it('writes nothing for an identical comparison or outside withAnalysis', async () => {
    const hook = hookOf();
    const ctx: { input: { extra?: Record<string, Record<string, unknown>> } } =
      { input: {} };
    captureComparison(before, after, diff);
    hook(ctx, measurement);
    await withAnalysis(async () => {
      captureComparison(before, before, image(40, 40, [240, 240, 240]));
      hook(ctx, { ...measurement, result: { diffPixels: 0 } });
      hook(ctx, { kind: 'missing-baseline' });
    });
    expect(ctx.input.extra).toBeUndefined();
  });

  it('ends the message of a failed comparison with the description', async () => {
    const { afterCompare, decide } = hooksOf();
    const failed = { status: 'failed', message: '256 pixels differ.' };
    const passed = { status: 'passed', message: 'Within the limit.' };
    expect(decide({}, failed)).toBe(failed);
    await withAnalysis(async () => {
      captureComparison(before, after, diff);
      afterCompare({ input: {} }, measurement);
      expect(decide({}, failed).message).toBe(
        '256 pixels differ. One area changed: 16x16 px at x=8, y=8.',
      );
      expect(decide({}, passed)).toBe(passed);
    });
  });
});
