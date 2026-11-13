import type { Region, RegionKind, RgbaImage } from './types';

type Color = [number, number, number];

/** Differing pixels closer than this are one area: a changed word is one region, not one per letter. */
export const CELL = 8;
const SPECK_SIDE = 4;
const BAND_SPAN = 0.9;
const BAND_THICKNESS = 0.05;

/**
 * Which pixels pixelmatch counted as different, read back from its diff
 * image: those painted with `diffColor` (or `diffColorAlt`). Anti-aliased and
 * unchanged pixels are not. A `diffColor` that is a shade of grey can collide
 * with unchanged pixels.
 */
export const maskFromPixelmatchDiff = (
  diff: RgbaImage,
  {
    diffColor = [255, 0, 0],
    diffColorAlt,
  }: { diffColor?: Color; diffColorAlt?: Color } = {},
): Uint8Array => {
  const colors = diffColorAlt ? [diffColor, diffColorAlt] : [diffColor];
  const { data } = diff;
  const mask = new Uint8Array(diff.width * diff.height);
  for (let at = 0; at < mask.length; at++) {
    const p = at * 4;
    if (data[p + 3] !== 255) continue;
    for (const [r, g, b] of colors) {
      if (data[p] === r && data[p + 1] === g && data[p + 2] === b) {
        mask[at] = 1;
        break;
      }
    }
  }
  return mask;
};

const kindOf = (
  box: { width: number; height: number },
  image: { width: number; height: number },
): RegionKind => {
  if (box.width <= SPECK_SIDE && box.height <= SPECK_SIDE) return 'speck';
  const thin = (side: number, of: number) =>
    side <= Math.max(CELL, of * BAND_THICKNESS);
  const horizontal =
    box.width >= image.width * BAND_SPAN && thin(box.height, image.height);
  const vertical =
    box.height >= image.height * BAND_SPAN && thin(box.width, image.width);
  return horizontal || vertical ? 'band' : 'block';
};

export type Regions = {
  /** Largest first. */
  regions: Region[];
  truncated?: { count: number; area: number };
  diffPixels: number;
};

/**
 * Groups the differing pixels of `mask` (1 = differs, row by row) into areas.
 * Pixels are connected through a grid of `CELL`-sized cells, so nearby
 * differences form one area; each area's box and pixel count are exact.
 */
export const findRegions = (
  mask: Uint8Array,
  width: number,
  height: number,
  { maxRegions = 50 }: { maxRegions?: number } = {},
): Regions => {
  const cols = Math.ceil(width / CELL);
  const rows = Math.ceil(height / CELL);
  const on = new Uint8Array(cols * rows);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / CELL) * cols;
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) on[row + Math.floor(x / CELL)] = 1;
    }
  }

  // label the cells: 0 = none, n = component n
  const label = new Int32Array(cols * rows);
  let components = 0;
  const stack: number[] = [];
  for (let start = 0; start < on.length; start++) {
    if (!on[start] || label[start]) continue;
    label[start] = ++components;
    stack.push(start);
    while (stack.length > 0) {
      const cell = stack.pop() as number;
      const cx = cell % cols;
      const cy = (cell - cx) / cols;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const next = ny * cols + nx;
          if (on[next] && !label[next]) {
            label[next] = components;
            stack.push(next);
          }
        }
      }
    }
  }

  const minX = new Int32Array(components + 1).fill(width);
  const minY = new Int32Array(components + 1).fill(height);
  const maxX = new Int32Array(components + 1).fill(-1);
  const maxY = new Int32Array(components + 1).fill(-1);
  const area = new Int32Array(components + 1);
  let diffPixels = 0;
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / CELL) * cols;
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      const id = label[row + Math.floor(x / CELL)];
      diffPixels++;
      area[id]++;
      if (x < minX[id]) minX[id] = x;
      if (x > maxX[id]) maxX[id] = x;
      if (y < minY[id]) minY[id] = y;
      if (y > maxY[id]) maxY[id] = y;
    }
  }

  const all: Region[] = [];
  for (let id = 1; id <= components; id++) {
    const box = {
      x: minX[id],
      y: minY[id],
      width: maxX[id] - minX[id] + 1,
      height: maxY[id] - minY[id] + 1,
    };
    all.push({
      ...box,
      area: area[id],
      fillRatio: area[id] / (box.width * box.height),
      kind: kindOf(box, { width, height }),
    });
  }
  all.sort((a, b) => b.area - a.area || a.y - b.y || a.x - b.x);

  const regions = all.slice(0, maxRegions);
  const rest = all.slice(maxRegions);
  return {
    regions,
    diffPixels,
    ...(rest.length > 0 && {
      truncated: {
        count: rest.length,
        area: rest.reduce((sum, region) => sum + region.area, 0),
      },
    }),
  };
};
