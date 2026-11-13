import type { Box, RgbaImage, Shift } from './types';

type Axis = 'x' | 'y';
type Options = { maxShift?: number; minExplained?: number; minLines?: number };
type Found = { offset: number; coverage: number; explained: number };

/**
 * FNV-1a over the bytes of every line along `axis` (rows for `y`, columns for
 * `x`), for the lines `from..to` and only the part of each line inside
 * `across`. Equal lines have equal hashes. Index 0 of the result is line `from`.
 */
const lineHashes = (
  { width, data }: RgbaImage,
  axis: Axis,
  from: number,
  to: number,
  across: { from: number; to: number },
): Uint32Array => {
  const hashes = new Uint32Array(Math.max(0, to - from));
  for (let line = from; line < to; line++) {
    let hash = 0x811c9dc5;
    for (let other = across.from; other < across.to; other++) {
      const at =
        (axis === 'y' ? line * width + other : other * width + line) * 4;
      hash = Math.imul(hash ^ data[at], 0x01000193);
      hash = Math.imul(hash ^ data[at + 1], 0x01000193);
      hash = Math.imul(hash ^ data[at + 2], 0x01000193);
      hash = Math.imul(hash ^ data[at + 3], 0x01000193);
    }
    hashes[line - from] = hash >>> 0;
  }
  return hashes;
};

/**
 * The offset that explains the changed lines between `start` and `end`: at
 * least `minExplained` of them equal the baseline line `offset` lines away.
 * Lines that did not change (a blank page) prove nothing and are left out of
 * that share.
 */
const findOffset = (
  before: Uint32Array,
  after: Uint32Array,
  start: number,
  end: number,
  { maxShift = 64, minExplained = 0.9, minLines = 4 }: Options,
): Found | null => {
  let best: Found | null = null;
  for (let step = 1; step <= maxShift; step++) {
    for (const offset of [step, -step]) {
      const lo = Math.max(start + Math.max(offset, 0), offset, 0);
      const hi = Math.min(
        end - Math.max(-offset, 0),
        before.length + Math.min(offset, 0),
      );
      let changed = 0;
      let explained = 0;
      let matching = 0;
      for (let at = lo; at < hi; at++) {
        const moved = after[at] === before[at - offset];
        if (moved) matching++;
        if (after[at] !== before[at]) {
          changed++;
          if (moved) explained++;
        }
      }
      if (changed < minLines) continue;
      const share = explained / changed;
      if (share >= minExplained && (!best || share > best.explained)) {
        best = { offset, coverage: matching / (hi - lo), explained: share };
      }
    }
  }
  return best;
};

const better = <T extends { found: Found }>(a: T | null, b: T | null) =>
  !b || (a && a.found.explained >= b.found.explained) ? a : b;

/**
 * Is the screenshot the baseline with everything below some row moved up or
 * down, or everything right of some column moved left or right? That is what
 * an element that grew or shrank causes. One direction at a time.
 */
export const detectShift = (
  baseline: RgbaImage,
  actual: RgbaImage,
  options: Options = {},
): Shift | null => {
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return null;
  }
  const along = (axis: Axis) => {
    const length = axis === 'y' ? baseline.height : baseline.width;
    const across = {
      from: 0,
      to: axis === 'y' ? baseline.width : baseline.height,
    };
    const before = lineHashes(baseline, axis, 0, length, across);
    const after = lineHashes(actual, axis, 0, length, across);
    let first = 0;
    while (first < length && before[first] === after[first]) first++;
    if (first === length) return null;
    const found = findOffset(before, after, first, length, options);
    return found && { axis, first, found };
  };
  const best = better(along('y'), along('x'));
  if (!best) return null;
  const { axis, first, found } = best;
  return {
    fromX: axis === 'x' ? first : 0,
    fromY: axis === 'y' ? first : 0,
    dx: axis === 'x' ? found.offset : 0,
    dy: axis === 'y' ? found.offset : 0,
    coverage: found.coverage,
  };
};

/**
 * Did the content of one changed area only move, up, down, left or right? A
 * moved element leaves an area that covers its old and its new place; inside
 * it the screenshot equals the baseline a fixed number of pixels away.
 */
export const detectRegionShift = (
  baseline: RgbaImage,
  actual: RgbaImage,
  box: Box,
  options: Options = {},
): { dx: number; dy: number } | null => {
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    return null;
  }
  const reach = options.maxShift ?? 64;
  const along = (axis: Axis) => {
    const length = axis === 'y' ? baseline.height : baseline.width;
    const start = axis === 'y' ? box.y : box.x;
    const end = start + (axis === 'y' ? box.height : box.width);
    const across =
      axis === 'y'
        ? { from: box.x, to: box.x + box.width }
        : { from: box.y, to: box.y + box.height };
    // lines around the area too: the content came from, or went, outside of it
    const from = Math.max(0, start - reach);
    const to = Math.min(length, end + reach);
    const found = findOffset(
      lineHashes(baseline, axis, from, to, across),
      lineHashes(actual, axis, from, to, across),
      start - from,
      end - from,
      options,
    );
    return found && { axis, found };
  };
  const best = better(along('y'), along('x'));
  if (!best) return null;
  return {
    dx: best.axis === 'x' ? best.found.offset : 0,
    dy: best.axis === 'y' ? best.found.offset : 0,
  };
};
