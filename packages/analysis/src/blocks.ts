import { findRegions } from './regions';
import type { Region, RgbaImage, Size } from './types';

/**
 * Finds content that moved from the pixels alone, for comparisons that have no
 * layout snapshot of the page (an old baseline, the compare CLI, a stitched
 * Cypress capture).
 *
 * It cuts both images into 8 px blocks, looks for where the blocks that hold
 * differing pixels went in the other image, and checks every differing pixel
 * at the offsets found nearby, with a small colour tolerance: a moved picture
 * or gradient is redrawn a colour step off. What no offset explains is left
 * over. It answers only when the answer is definite (see `DEFINITE`); in every
 * other case it returns `undefined` and the analysis claims nothing about
 * moves. The tolerance and the thresholds were set on a spike's 40 cases and
 * are deliberately stricter than the best score there.
 */

/** Block side. */
const B = 8;
/** Per channel, how far a moved pixel may be from its source. */
const TOLERANCE = 3;
/** Offsets are searched this far from where they were seen, in pixels. */
const REACH_PIXELS = 48;
/** Images with more pixels than this are searched at a reduced size: the search needs several arrays of that size. */
export const MAX_PIXELS = 4_000_000;
/** The most an image is reduced by, per side. A retina screenshot needs 2; beyond this the detail is gone. */
const MAX_REDUCTION = 4;

/**
 * What it takes to claim a move. Anything weaker is not reported at all, so
 * a wrong "moved" cannot reach a sentence or the review.
 */
export const DEFINITE = {
  /** An offset needs this much support: blocks that found it, each counted once. */
  votes: 3,
  /** Share of differing pixels nothing explains, at most, for "only moved". */
  leftoverMoved: 0.01,
  /** The same for "moved, and something else changed". More left than this is a rewrite that happens to contain a move. */
  leftoverPartly: 0.25,
  /** Share of differing pixels that the reported moves explain, at least. */
  explainedByMoves: 0.5,
  /** An offset that explains less than this share is not reported. */
  reportedShare: 0.01,
} as const;

export type PixelMove = {
  /** Content at (x, y) in the baseline is at (x + dx, y + dy) in the screenshot. */
  dx: number;
  dy: number;
  /** Share of the differing pixels this offset explains, 0..1. */
  share: number;
};

export type PixelMoves = {
  /** `moved`: the move explains everything. `moved-and-changed`: it explains most, `unexplained` is the rest. */
  verdict: 'moved' | 'moved-and-changed';
  /** Most pixels first, at most 5. */
  moves: PixelMove[];
  /** Share of the differing pixels explained by a move or by uncovered background, 0..1. */
  explained: number;
  /** What no move explains, largest first. Empty for `moved`. */
  unexplained: Region[];
};

const OFFSET = 65536;
const KEY = 131072;
const key = (dx: number, dy: number) => (dx + OFFSET) * KEY + (dy + OFFSET);
const unkey = (k: number): [number, number] => [
  Math.floor(k / KEY) - OFFSET,
  (k % KEY) - OFFSET,
];

const px32 = ({ data }: RgbaImage): Uint32Array =>
  data.byteOffset % 4 === 0
    ? new Uint32Array(data.buffer, data.byteOffset, data.length >> 2)
    : new Uint32Array(
        data.buffer.slice(data.byteOffset, data.byteOffset + data.length),
      );

const close = (a: number, b: number) =>
  a === b ||
  (Math.abs((a & 255) - (b & 255)) <= TOLERANCE &&
    Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)) <= TOLERANCE &&
    Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255)) <= TOLERANCE &&
    Math.abs((a >>> 24) - (b >>> 24)) <= TOLERANCE);

const P = 0x01000193;
const Q = 0x85ebca6b;
const pow = (base: number, n: number) => {
  let out = 1;
  for (let i = 0; i < n; i++) out = Math.imul(out, base);
  return out;
};

/** Hash of the BxB window whose top left corner is every pixel. */
const windowHashes = (px: Uint32Array, w: number, h: number): Uint32Array => {
  const hw = w - B + 1;
  const hh = h - B + 1;
  const row = new Uint32Array(w * h);
  const PB = pow(P, B - 1);
  for (let y = 0; y < h; y++) {
    let hash = 0;
    for (let i = 0; i < B; i++) hash = (Math.imul(hash, P) + px[y * w + i]) | 0;
    row[y * w] = hash;
    for (let x = 1; x < hw; x++) {
      hash =
        (Math.imul(hash - Math.imul(px[y * w + x - 1], PB), P) +
          px[y * w + x + B - 1]) |
        0;
      row[y * w + x] = hash;
    }
  }
  const out = new Uint32Array(w * h);
  const QB = pow(Q, B - 1);
  for (let x = 0; x < hw; x++) {
    let hash = 0;
    for (let i = 0; i < B; i++)
      hash = (Math.imul(hash, Q) + row[i * w + x]) | 0;
    out[x] = hash;
    for (let y = 1; y < hh; y++) {
      hash =
        (Math.imul(hash - Math.imul(row[(y - 1) * w + x], QB), Q) +
          row[(y + B - 1) * w + x]) |
        0;
      out[y * w + x] = hash;
    }
  }
  return out;
};

const sameWindow = (
  a: Uint32Array,
  ax: number,
  ay: number,
  b: Uint32Array,
  bx: number,
  by: number,
  w: number,
) => {
  for (let j = 0; j < B; j++) {
    const ra = (ay + j) * w + ax;
    const rb = (by + j) * w + bx;
    for (let i = 0; i < B; i++) if (a[ra + i] !== b[rb + i]) return false;
  }
  return true;
};

/** Count of differing pixels inside any rectangle, in constant time. */
const integral = (mask: Uint8Array, w: number, h: number) => {
  const sat = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      run += mask[y * w + x];
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + run;
    }
  }
  return (x0: number, y0: number, x1: number, y1: number) => {
    x0 = Math.max(0, x0);
    y0 = Math.max(0, y0);
    x1 = Math.min(w, x1);
    y1 = Math.min(h, y1);
    return (
      sat[y1 * (w + 1) + x1] -
      sat[y0 * (w + 1) + x1] -
      sat[y1 * (w + 1) + x0] +
      sat[y0 * (w + 1) + x0]
    );
  };
};

/**
 * Where the grid blocks of `from` that hold differing pixels are found in
 * `to`, exactly, as displacements seen from `from`. A block only counts when
 * the place it is found at differs too: a copy of untouched content is not a move.
 */
const matchBlocks = (
  from: Uint32Array,
  to: Uint32Array,
  mask: Uint8Array,
  w: number,
  h: number,
  toHashes: Uint32Array,
  changedIn: (x0: number, y0: number, x1: number, y1: number) => number,
) => {
  const cols = Math.floor(w / B);
  const rows = Math.floor(h / B);
  const fromHashes = windowHashes(from, w, h);
  const wanted = new Map<number, number[]>();
  for (let by = 0; by < rows; by++) {
    for (let bx = 0; bx < cols; bx++) {
      const x0 = bx * B;
      const y0 = by * B;
      let diff = false;
      let textured = false;
      const first = from[y0 * w + x0];
      for (let j = 0; j < B && !(diff && textured); j++) {
        for (let i = 0; i < B; i++) {
          const at = (y0 + j) * w + x0 + i;
          if (mask[at]) diff = true;
          if (from[at] !== first) textured = true;
        }
      }
      if (!diff || !textured) continue;
      const hash = fromHashes[y0 * w + x0];
      const list = wanted.get(hash);
      if (list) list.push(by * cols + bx);
      else wanted.set(hash, [by * cols + bx]);
    }
  }
  const found = new Map<number, number[]>();
  for (let y = 0; y <= h - B; y++) {
    for (let x = 0; x <= w - B; x++) {
      const blocks = wanted.get(toHashes[y * w + x]);
      if (!blocks) continue;
      for (const block of blocks) {
        const x0 = (block % cols) * B;
        const y0 = Math.floor(block / cols) * B;
        if (x === x0 && y === y0) continue;
        const list = found.get(block) ?? [];
        if (list.length >= 64) continue;
        if (!changedIn(x, y, x + B, y + B)) continue;
        if (!sameWindow(from, x0, y0, to, x, y, w)) continue;
        list.push(key(x - x0, y - y0));
        found.set(block, list);
      }
    }
  }
  return { found, cols, rows };
};

type SearchInput = {
  baseline: RgbaImage;
  actual: RgbaImage;
  mask: Uint8Array;
  sizes?: { baseline: Size; actual: Size };
};

const search = ({
  baseline,
  actual,
  mask,
  sizes,
}: SearchInput): PixelMoves | undefined => {
  const { width: w, height: h } = actual;
  if (w < B * 2 || h < B * 2) return;
  if (baseline.width !== w || baseline.height !== h) return;
  const base = px32(baseline);
  const act = px32(actual);
  const changedIn = integral(mask, w, h);
  const bwd = matchBlocks(
    base,
    act,
    mask,
    w,
    h,
    windowHashes(act, w, h),
    changedIn,
  );
  const fwd = matchBlocks(
    act,
    base,
    mask,
    w,
    h,
    windowHashes(base, w, h),
    changedIn,
  );
  const { cols, rows } = bwd;

  // offsets as "content at q in the baseline is at q + d in the screenshot"
  const votes = new Map<number, number>();
  const perBlock = Array.from({ length: cols * rows }, () => new Set<number>());
  const collect = (lists: Map<number, number[]>, sign: 1 | -1) => {
    for (const [block, list] of lists) {
      for (const k of list) {
        const [dx, dy] = unkey(k);
        const kk = key(sign * dx, sign * dy);
        votes.set(kk, (votes.get(kk) ?? 0) + 1 / list.length);
        perBlock[block].add(kk);
      }
    }
  };
  collect(bwd.found, 1);
  collect(fwd.found, -1);
  const ranked = [...votes]
    .filter(([, v]) => v >= DEFINITE.votes)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) return;
  const strong = new Set(ranked.map(([k]) => k));
  const top = ranked.slice(0, 8).map(([k]) => k);
  const reach = Math.ceil(REACH_PIXELS / B);
  const near = perBlock.map((_, block) => {
    const bx = block % cols;
    const by = Math.floor(block / cols);
    const set = new Set(top);
    for (let j = -reach; j <= reach; j++) {
      for (let i = -reach; i <= reach; i++) {
        const x = bx + i;
        const y = by + j;
        if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
        for (const k of perBlock[y * cols + x]) if (strong.has(k)) set.add(k);
      }
    }
    return [...set].map(unkey);
  });

  // does the 3x3 neighbourhood of a at (ax, ay) equal that of b at (bx, by)?
  const win = (
    a: Uint32Array,
    ax: number,
    ay: number,
    b: Uint32Array,
    bx: number,
    by: number,
  ) => {
    if (bx < 0 || by < 0 || bx >= w || by >= h) return false;
    for (let j = -1; j <= 1; j++) {
      for (let i = -1; i <= 1; i++) {
        const x1 = ax + i;
        const y1 = ay + j;
        const x2 = bx + i;
        const y2 = by + j;
        if (x1 < 0 || y1 < 0 || x1 >= w || y1 >= h) continue;
        if (x2 < 0 || y2 < 0 || x2 >= w || y2 >= h) continue;
        if (!close(a[y1 * w + x1], b[y2 * w + x2])) return false;
      }
    }
    return true;
  };
  // a pixel that shows (or showed) plain background next to untouched background
  const background = (img: Uint32Array, x: number, y: number) => {
    const v = img[y * w + x];
    for (const [sx, sy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let n = 1; n <= 64; n++) {
        const qx = x + sx * n;
        const qy = y + sy * n;
        if (qx < 0 || qy < 0 || qx >= w || qy >= h) break;
        if (mask[qy * w + qx]) continue;
        // the further away the neighbour, the more the gradient may have moved on
        const tol = 2 + n / 4;
        const u = img[qy * w + qx];
        if (
          Math.abs((v & 255) - (u & 255)) <= tol &&
          Math.abs(((v >>> 8) & 255) - ((u >>> 8) & 255)) <= tol &&
          Math.abs(((v >>> 16) & 255) - ((u >>> 16) & 255)) <= tol
        ) {
          return true;
        }
        break;
      }
    }
    return false;
  };

  let total = 0;
  let unexplainedPixels = 0;
  let movedPixels = 0;
  const residual = new Uint8Array(w * h);
  const used = new Map<number, number>();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      total++;
      const bx = Math.min(cols - 1, Math.floor(x / B));
      const by = Math.min(rows - 1, Math.floor(y / B));
      const offsets = near[by * cols + bx];
      let newFrom = false; // the new pixel came from somewhere
      let oldWent = false; // the old pixel went somewhere
      for (const [dx, dy] of offsets) {
        if (!newFrom && win(act, x, y, base, x - dx, y - dy)) {
          newFrom = true;
          used.set(key(dx, dy), (used.get(key(dx, dy)) ?? 0) + 1);
        }
        if (!oldWent && win(base, x, y, act, x + dx, y + dy)) oldWent = true;
        if (newFrom && oldWent) break;
      }
      // padding of the smaller image: nothing there to add or lose
      if (sizes) {
        if (x >= sizes.actual.width || y >= sizes.actual.height) newFrom = true;
        if (x >= sizes.baseline.width || y >= sizes.baseline.height) {
          oldWent = true;
        }
      }
      // a moving element uncovers and covers plain background
      if (offsets.length > 0) {
        if (!newFrom && oldWent && background(act, x, y)) newFrom = true;
        if (!oldWent && newFrom && background(base, x, y)) oldWent = true;
      }
      if (newFrom) movedPixels++;
      if (!newFrom || !oldWent) {
        unexplainedPixels++;
        residual[y * w + x] = 1;
      }
    }
  }
  if (total === 0) return;

  const left = findRegions(residual, w, h);
  const unexplained = left.regions.filter(
    (r) =>
      r.kind !== 'speck' &&
      r.area >= 16 &&
      (r.fillRatio >= 0.1 || r.area >= 400),
  );
  const leftover = unexplainedPixels / total;
  const moves = [...used]
    .map(([k, n]) => {
      const [dx, dy] = unkey(k);
      return { dx, dy, share: n / total };
    })
    .filter((move) => move.share >= DEFINITE.reportedShare)
    .sort((a, b) => b.share - a.share)
    .slice(0, 5);
  if (moves.length === 0) return;
  const explainedByMoves = movedPixels / total;

  const only = unexplained.length === 0 && leftover <= DEFINITE.leftoverMoved;
  const partly =
    unexplained.length >= 1 &&
    !left.truncated &&
    leftover <= DEFINITE.leftoverPartly;
  if (explainedByMoves < DEFINITE.explainedByMoves) return;
  if (!only && !partly) return;
  return {
    verdict: only ? 'moved' : 'moved-and-changed',
    moves,
    explained: 1 - leftover,
    unexplained: only ? [] : unexplained,
  };
};

/** The image with every `k` x `k` square of pixels averaged into one. */
const reduce = (image: RgbaImage, k: number): RgbaImage => {
  const { width: w, height: h, data } = image;
  const rw = Math.ceil(w / k);
  const rh = Math.ceil(h / k);
  const out = new Uint8ClampedArray(rw * rh * 4);
  for (let ry = 0; ry < rh; ry++) {
    for (let rx = 0; rx < rw; rx++) {
      const sum = [0, 0, 0, 0];
      let n = 0;
      for (let y = ry * k; y < Math.min(h, ry * k + k); y++) {
        for (let x = rx * k; x < Math.min(w, rx * k + k); x++) {
          const i = (y * w + x) * 4;
          for (let c = 0; c < 4; c++) sum[c] += data[i + c];
          n++;
        }
      }
      for (let c = 0; c < 4; c++) out[(ry * rw + rx) * 4 + c] = sum[c] / n;
    }
  }
  return { width: rw, height: rh, data: out };
};

/** A reduced pixel counts as different when any pixel in its square did. */
const reduceMask = (
  mask: Uint8Array,
  w: number,
  h: number,
  k: number,
): Uint8Array => {
  const rw = Math.ceil(w / k);
  const out = new Uint8Array(rw * Math.ceil(h / k));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x]) out[Math.floor(y / k) * rw + Math.floor(x / k)] = 1;
    }
  }
  return out;
};

/** Changed pixels the offset explains at full size, as a share of those looked at. */
const matchAt = (
  base: Uint32Array,
  act: Uint32Array,
  mask: Uint8Array,
  w: number,
  h: number,
  dx: number,
  dy: number,
  sample: number[],
) => {
  let hit = 0;
  for (const p of sample) {
    const x = (p % w) - dx;
    const y = Math.floor(p / w) - dy;
    if (x >= 0 && y >= 0 && x < w && y < h && close(act[p], base[y * w + x])) {
      hit++;
    }
  }
  return sample.length === 0 ? 0 : hit / sample.length;
};

const SAMPLE = 20_000;

/**
 * Content that moved between two images of the same size, or `undefined`
 * when there is no definite answer: no offset with enough support, too much
 * left unexplained, content pushed out of the picture, or an image too large
 * to search even reduced. `sizes` are the sizes before padding; padding is not
 * content.
 *
 * An image over `MAX_PIXELS` (a retina screenshot) is searched at a reduced
 * size. Each offset found is then checked at full size, within the reduction
 * of where it was found, and kept only when full-size pixels agree with it.
 */
export const findMoves = (input: SearchInput): PixelMoves | undefined => {
  const { baseline, actual, mask, sizes } = input;
  const { width: w, height: h } = actual;
  if (baseline.width !== w || baseline.height !== h) return;
  if (w * h <= MAX_PIXELS) return search(input);

  let k = 2;
  while (Math.ceil(w / k) * Math.ceil(h / k) > MAX_PIXELS) k++;
  if (k > MAX_REDUCTION) return;
  const scaled = (size: Size): Size => ({
    width: Math.ceil(size.width / k),
    height: Math.ceil(size.height / k),
  });
  const found = search({
    baseline: reduce(baseline, k),
    actual: reduce(actual, k),
    mask: reduceMask(mask, w, h, k),
    sizes: sizes && {
      baseline: scaled(sizes.baseline),
      actual: scaled(sizes.actual),
    },
  });
  if (!found) return;

  // the offsets, to the pixel: the reduced search only knows them to within k
  const base = px32(baseline);
  const act = px32(actual);
  const changed: number[] = [];
  for (let p = 0; p < mask.length; p++) if (mask[p]) changed.push(p);
  const stride = Math.max(1, Math.floor(changed.length / SAMPLE));
  const sample = changed.filter((_, i) => i % stride === 0);
  const moves: PixelMove[] = [];
  const around = 2 * k;
  for (const move of found.moves) {
    // the best offset within two reductions of the reduced one; two equally good ones is no answer
    let best = { dx: 0, dy: 0, score: -1, ties: 0 };
    for (let j = -around; j <= around; j++) {
      for (let i = -around; i <= around; i++) {
        const dx = move.dx * k + i;
        const dy = move.dy * k + j;
        const score = matchAt(base, act, mask, w, h, dx, dy, sample);
        if (score > best.score) best = { dx, dy, score, ties: 0 };
        else if (score === best.score) best.ties++;
      }
    }
    // full-size pixels must back up what the reduced ones said
    if (best.ties === 0 && best.score >= move.share * 0.5) {
      moves.push({ dx: best.dx, dy: best.dy, share: move.share });
    }
  }
  if (moves.length === 0 || moves[0].share !== found.moves[0].share) return;
  return {
    ...found,
    moves,
    unexplained: found.unexplained.map((region) => {
      const x = region.x * k;
      const y = region.y * k;
      return {
        ...region,
        x,
        y,
        width: Math.min(w - x, region.width * k),
        height: Math.min(h - y, region.height * k),
        area: region.area * k * k,
        hash: undefined,
      };
    }),
  };
};
