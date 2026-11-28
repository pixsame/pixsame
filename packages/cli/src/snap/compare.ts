import {
  diffLayouts,
  facts,
  findRegions,
  maskFromPixelmatchDiff,
  type Fact,
  type Layout,
  type LayoutNode,
  type Rect,
  type Region,
} from '@pixsame/analysis';

// pixelmatch 7 and visual-regression-compare are ESM-only; a dynamic import
// works from this CommonJS build
const tools = async () => {
  const [{ default: pixelmatch }, { decodePng, encodePng }] = await Promise.all(
    [import('pixelmatch'), import('visual-regression-compare')],
  );
  return { pixelmatch, decodePng, encodePng };
};

type Pixels = { width: number; height: number; data: Uint8ClampedArray };

const grow = (image: Pixels, width: number, height: number): Pixels => {
  if (image.width === width && image.height === height) return image;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < image.height; y++) {
    const from = y * image.width * 4;
    data.set(image.data.subarray(from, from + image.width * 4), y * width * 4);
  }
  return { width, height, data };
};

/** Grows both images to the larger size with transparent pixels. */
const padToSame = (a: Pixels, b: Pixels): [Pixels, Pixels] => {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  return [grow(a, width, height), grow(b, width, height)];
};

/** Pixels to leave out of a comparison: 1 = changes by itself. As large as the screenshot it was found on. */
export type Unstable = { width: number; height: number; mask: Uint8Array };

/** An element larger than this share of the screenshot is not left out as a whole. */
const MAX_ELEMENT_SHARE = 0.25;

/**
 * The smallest element that holds `area`, as a box in image pixels: when a
 * clock changes, the next change lands elsewhere inside it, so the whole
 * element is unstable, not just the pixels seen changing this time.
 */
const elementAround = (
  area: Region,
  layout: Layout,
  width: number,
  height: number,
): Region | undefined => {
  let best: [number, number, number, number] | undefined;
  const visit = (node: LayoutNode) => {
    const [x, y, w, h] = node.rect.map((v) => v * layout.scale);
    if (
      x <= area.x &&
      y <= area.y &&
      x + w >= area.x + area.width &&
      y + h >= area.y + area.height &&
      (!best || w * h < best[2] * best[3])
    ) {
      best = [x, y, w, h];
    }
    node.kids.forEach(visit);
  };
  visit(layout.root);
  if (!best || best[2] * best[3] > width * height * MAX_ELEMENT_SHARE) return;
  const x0 = Math.max(0, Math.floor(best[0]));
  const y0 = Math.max(0, Math.floor(best[1]));
  const x1 = Math.min(width, Math.ceil(best[0] + best[2]));
  const y1 = Math.min(height, Math.ceil(best[1] + best[3]));
  return { ...area, x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
};

/**
 * What differs between two screenshots of a page nobody touched in between:
 * every pixel whose bytes differ, widened to the element it sits in when a
 * layout says which. `undefined` when the screenshots are the same.
 */
export const unstableBetween = async (
  first: Uint8Array,
  second: Uint8Array,
  layouts: (Layout | undefined)[] = [],
): Promise<Unstable | undefined> => {
  const { decodePng } = await tools();
  const [a, b] = padToSame(decodePng(first), decodePng(second));
  const mask = new Uint8Array(a.width * a.height);
  let any = false;
  for (let at = 0; at < mask.length; at++) {
    const p = at * 4;
    if (
      a.data[p] !== b.data[p] ||
      a.data[p + 1] !== b.data[p + 1] ||
      a.data[p + 2] !== b.data[p + 2] ||
      a.data[p + 3] !== b.data[p + 3]
    ) {
      mask[at] = 1;
      any = true;
    }
  }
  if (!any) return undefined;
  const { width, height } = a;
  for (const layout of layouts) {
    if (!layout) continue;
    for (const area of findRegions(mask, width, height).regions) {
      const box = elementAround(area, layout, width, height);
      if (!box) continue;
      for (let y = box.y; y < box.y + box.height; y++) {
        mask.fill(1, y * width + box.x, y * width + box.x + box.width);
      }
    }
  }
  return { width, height, mask };
};

/** Around each unstable pixel, this many more are left out: a moving thing has a soft edge. */
const UNSTABLE_MARGIN = 2;

const leaveOut = (
  mask: Uint8Array,
  width: number,
  height: number,
  unstable: Unstable,
  value = 0,
) => {
  for (let y = 0; y < unstable.height; y++) {
    for (let x = 0; x < unstable.width; x++) {
      if (!unstable.mask[y * unstable.width + x]) continue;
      for (
        let py = Math.max(0, y - UNSTABLE_MARGIN);
        py <= Math.min(height - 1, y + UNSTABLE_MARGIN);
        py++
      ) {
        for (
          let px = Math.max(0, x - UNSTABLE_MARGIN);
          px <= Math.min(width - 1, x + UNSTABLE_MARGIN);
          px++
        ) {
          mask[py * width + px] = value;
        }
      }
    }
  }
};

/** Stores an unstable mask as a PNG: black where a pixel changes by itself. */
export const encodeUnstable = async ({ width, height, mask }: Unstable) => {
  const { encodePng } = await tools();
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < mask.length; at++) if (mask[at]) data[at * 4 + 3] = 255;
  return encodePng({ width, height, data });
};

export const decodeUnstable = async (png: Uint8Array): Promise<Unstable> => {
  const { decodePng } = await tools();
  const { width, height, data } = decodePng(png);
  const mask = new Uint8Array(width * height);
  for (let at = 0; at < mask.length; at++) mask[at] = data[at * 4 + 3] ? 1 : 0;
  return { width, height, mask };
};

/** The areas of an unstable mask, largest first. */
export const unstableAreas = ({ width, height, mask }: Unstable): Region[] =>
  findRegions(mask, width, height).regions;

const CROP_MARGIN = 8;

const crop = (
  image: Pixels,
  area: Pick<Region, 'x' | 'y' | 'width' | 'height'>,
): Pixels => {
  const x0 = Math.max(0, area.x - CROP_MARGIN);
  const y0 = Math.max(0, area.y - CROP_MARGIN);
  const x1 = Math.min(image.width, area.x + area.width + CROP_MARGIN);
  const y1 = Math.min(image.height, area.y + area.height + CROP_MARGIN);
  const width = x1 - x0;
  const height = y1 - y0;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((y0 + y) * image.width + x0) * 4;
    data.set(image.data.subarray(from, from + width * 4), y * width * 4);
  }
  return { width, height, data };
};

/**
 * Whether a fact comes with pictures: an area the layout does not explain,
 * or a look that changed in a way no stored style names (a background image,
 * a filter). Text cannot say what happened there; a small crop can.
 */
export const hasCrop = (fact: Fact): boolean =>
  fact.type === 'area' ||
  (fact.type === 'element' &&
    !fact.styles &&
    fact.kinds.some((kind) => kind === 'look' || kind === 'font') &&
    !fact.kinds.some((kind) => kind === 'added' || kind === 'removed'));

/** An element's rectangle (CSS pixels) as a box in image pixels. */
const boxOf = ([x, y, w, h]: Rect, scale: number) => ({
  x: Math.max(0, Math.floor(x * scale)),
  y: Math.max(0, Math.floor(y * scale)),
  width: Math.ceil(w * scale),
  height: Math.ceil(h * scale),
});

export type Compared = {
  facts: Fact[];
  /** For each fact that `hasCrop`, in order: what was there before and what is there now, as PNGs. */
  crops: { before: Uint8Array; after: Uint8Array }[];
};

/**
 * Says what changed from `before` to `after`. Pixels count as different the
 * way the test adapters count them (pixelmatch, anti-aliasing left out), and
 * the `unstable` ones do not count at all.
 */
export const compareShots = async ({
  before,
  after,
  unstable = [],
  twin,
  only,
}: {
  before: { png: Uint8Array; layout?: Layout };
  after: { png: Uint8Array; layout?: Layout };
  unstable?: Unstable[];
  /**
   * The layout of the other capture of `after`. Where the two agree, a
   * change the layout names is reported even on pixels that are left out.
   */
  twin?: Layout;
  /** The elements meant to change, as rectangles in the `after` screenshot. */
  only?: Rect[];
}): Promise<Compared> => {
  const { pixelmatch, decodePng, encodePng } = await tools();
  const rawBefore = decodePng(before.png);
  const rawAfter = decodePng(after.png);
  const sizes = {
    baseline: { width: rawBefore.width, height: rawBefore.height },
    actual: { width: rawAfter.width, height: rawAfter.height },
  };
  const [baseline, actual] = padToSame(rawBefore, rawAfter);
  const { width, height } = actual;
  const diff = new Uint8ClampedArray(width * height * 4);
  pixelmatch(baseline.data, actual.data, diff, width, height, {
    threshold: 0.1,
    includeAA: false,
  });
  const mask = maskFromPixelmatchDiff({ width, height, data: diff });
  // both captures come from this machine, so any difference is one: a change
  // too faint for a test's threshold is still what the edit did
  const faint = new Uint8Array(width * height);
  const one32 = new Uint32Array(
    baseline.data.buffer,
    baseline.data.byteOffset,
    width * height,
  );
  const two32 = new Uint32Array(
    actual.data.buffer,
    actual.data.byteOffset,
    width * height,
  );
  for (let at = 0; at < faint.length; at++) {
    if (one32[at] !== two32[at]) faint[at] = 1;
  }
  // left out, on elements that are the same in both captures of the page as
  // it is now: there the pixels flicker (a rotated box is drawn a little
  // differently each time) and the layout can still be believed
  const unseen =
    twin && after.layout && unstable.length > 0
      ? new Uint8Array(width * height)
      : undefined;
  for (const one of unstable) {
    leaveOut(mask, width, height, one);
    leaveOut(faint, width, height, one);
    if (unseen) leaveOut(unseen, width, height, one, 1);
  }
  if (unseen && twin && after.layout) {
    for (const { a, b, kinds } of diffLayouts(twin, after.layout).pairs) {
      if (kinds.length === 0 && a?.style === b?.style) continue;
      for (const [node, scale] of [
        [a, twin.scale],
        [b, after.layout.scale],
      ] as const) {
        if (!node) continue;
        const box = boxOf(node.rect, scale);
        const x0 = Math.max(0, box.x - UNSTABLE_MARGIN);
        const x1 = Math.min(width, box.x + box.width + UNSTABLE_MARGIN);
        const y1 = Math.min(height, box.y + box.height + UNSTABLE_MARGIN);
        for (let y = Math.max(0, box.y - UNSTABLE_MARGIN); y < y1; y++) {
          if (x1 > x0) unseen.fill(0, y * width + x0, y * width + x1);
        }
      }
    }
  }
  const found = facts({
    baseline,
    actual,
    mask,
    faint,
    unseen,
    sizes,
    layout:
      before.layout && after.layout
        ? { baseline: before.layout, actual: after.layout }
        : undefined,
    only,
  });
  return {
    facts: found,
    crops: found.filter(hasCrop).map((fact) => {
      const area =
        fact.type === 'area'
          ? fact.area
          : boxOf((fact as { rect: Rect }).rect, after.layout?.scale ?? 1);
      return {
        before: encodePng(crop(baseline, area)),
        after: encodePng(crop(actual, area)),
      };
    }),
  };
};
