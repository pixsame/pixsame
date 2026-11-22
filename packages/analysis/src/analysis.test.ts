import { describe, expect, it } from 'vitest';
import {
  analysisPlugin,
  analyze,
  bundle,
  captureComparison,
  findMoves,
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

describe('moves found from the pixels alone', () => {
  /** The page with everything from row `fromY` down moved by `by`, the rows it left filled with `fill`. */
  const shiftedDown = (
    source: RgbaImage,
    fromY: number,
    by: number,
    fill: [number, number, number] = [255, 255, 255],
  ) => {
    const target = clone(source);
    const stride = source.width * 4;
    for (let y = source.height - 1; y >= fromY + by; y--) {
      target.data.set(
        source.data.subarray((y - by) * stride, (y - by + 1) * stride),
        y * stride,
      );
    }
    paint(target, { x: 0, y: fromY, width: source.width, height: by }, fill);
    return target;
  };

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

  it('says content moved down when the pixels explain every difference', () => {
    const before = page();
    const result = analyzePair(before, shiftedDown(before, 70, 12));
    expect(result).toMatchObject({
      label: 'moved',
      description: 'Content moved down by 12 px.',
      bundleKey: 'moved:0,12',
    });
    expect(result.pixels?.moves[0]).toMatchObject({ dx: 0, dy: 12 });
    expect(result.pixels?.explained).toBeGreaterThan(0.99);
    expect(result.pixels?.unexplained).toEqual([]);
  });

  it('says what it cannot explain when a moved element uncovers other content', () => {
    // the badge sits over a bar of the page; moving it shows part of that bar
    const result = analyzePair(
      badge(page(300, 300), 100, 100),
      badge(page(300, 300), 108, 95),
    );
    expect(result.label).toBe('moved-and-changed');
    expect(result.pixels?.unexplained).toHaveLength(1);
  });

  it('says content moved up', () => {
    const after = page();
    const before = shiftedDown(after, 70, 12);
    expect(analyzePair(before, after).description).toBe(
      'Content moved up by 12 px.',
    );
  });

  it('finds a move sideways', () => {
    const before = badge(page(), 130, 250);
    const after = badge(page(), 142, 250);
    expect(analyzePair(before, after)).toMatchObject({
      label: 'moved',
      description: 'Content moved right by 12 px.',
    });
  });

  it('finds a diagonal move', () => {
    const before = badge(image(300, 300), 100, 100);
    const after = badge(image(300, 300), 108, 95);
    expect(analyzePair(before, after).description).toBe(
      'Content moved up by 5 px and right by 8 px.',
    );
  });

  it('names what else changed, when most of it moved', () => {
    const before = badge(page(300, 300), 130, 250);
    const after = paint(
      badge(page(300, 300), 142, 250),
      { x: 240, y: 40, width: 12, height: 12 },
      [0, 0, 0],
    );
    const result = analyzePair(before, after);
    expect(result.label).toBe('moved-and-changed');
    expect(result.description).toBe(
      'Content moved right by 12 px. Something else changed too: 12x12 px at x=240, y=40.',
    );
    expect(result.pixels?.unexplained).toHaveLength(1);
  });

  it('claims nothing for a change in place, even on a mostly blank page', () => {
    const before = image(200, 300);
    const after = paint(
      clone(before),
      { x: 20, y: 40, width: 80, height: 30 },
      [0, 0, 0],
    );
    const result = analyzePair(before, after);
    expect(result.label).toBe('content-change');
    expect(result.pixels).toBeUndefined();
  });

  it('claims nothing when a changed area is not a move of anything', () => {
    const before = page();
    const after = clone(before);
    // a new price: new pixels that sit nowhere in the baseline
    paint(after, { x: 20, y: 30, width: 40, height: 10 }, [10, 10, 10]);
    paint(after, { x: 30, y: 31, width: 7, height: 8 }, [250, 250, 250]);
    expect(analyzePair(before, after).pixels).toBeUndefined();
  });

  it('does not take a copy of untouched content for a move', () => {
    const before = badge(page(300, 300), 130, 250);
    // the same badge appears a second time; the first one stays
    const after = badge(badge(page(300, 300), 130, 250), 220, 250);
    const result = analyzePair(before, after);
    expect(result.label).toBe('content-change');
    expect(result.pixels).toBeUndefined();
  });

  it('claims nothing for content pushed out of the picture', () => {
    const before = page();
    const after = clone(before);
    const stride = before.width * 4;
    // everything moves up by 40 px and the top of the page is gone: same pixels as a removal
    after.data.copyWithin(0, 40 * stride);
    paint(after, { x: 0, y: 260, width: 200, height: 40 }, [255, 255, 255]);
    expect(analyzePair(before, after).label).not.toBe('moved');
  });

  describe('an image over the size limit (a retina screenshot)', () => {
    // 2560 x 1600 is over MAX_PIXELS: the search runs on a reduced copy
    const retina = () => {
      const target = image(2560, 1600);
      for (let i = 0; i < 14; i++) {
        paint(
          target,
          { x: 40 + ((i * 97) % 600), y: 40 + i * 100, width: 360, height: 60 },
          [20 + i * 10, 90, 200 - i * 8],
        );
        paint(
          target,
          { x: 60 + ((i * 97) % 600), y: 56 + i * 100, width: 120, height: 14 },
          [255, 255, 255],
        );
      }
      return target;
    };
    const moved = (by: number) => {
      const before = retina();
      const after = shiftedDown(before, 500, by);
      return findMoves({
        baseline: before,
        actual: after,
        mask: maskOf(before, after),
      });
    };

    it('finds a move and gives it to the pixel', () => {
      expect(moved(74)?.moves[0]).toMatchObject({ dx: 0, dy: 74 });
    });

    it('never reports an offset that is not the real one', () => {
      // an odd offset smears the reduced copy, so no answer is fine; a wrong one is not
      const result = moved(75);
      if (result) expect(result.moves[0]).toMatchObject({ dx: 0, dy: 75 });
    });

    it('does not call a change a move', () => {
      const before = retina();
      const after = clone(before);
      paint(after, { x: 300, y: 700, width: 500, height: 300 }, [200, 30, 30]);
      expect(
        findMoves({
          baseline: before,
          actual: after,
          mask: maskOf(before, after),
        }),
      ).toBeUndefined();
    });
  });

  it('takes the sizes of padded images into account', () => {
    const before = page(200, 300);
    const moved = shiftedDown(before, 70, 12);
    const result = analyze({
      baseline: before,
      actual: moved,
      mask: maskOf(before, moved),
      sizes: {
        baseline: { width: 200, height: 300 },
        actual: { width: 200, height: 300 },
      },
    });
    expect(result.label).toBe('moved');
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
