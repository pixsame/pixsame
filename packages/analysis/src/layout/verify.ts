import { findRegions } from '../regions';
import type { Region, RgbaImage } from '../types';
import {
  CHANGE,
  EPS,
  has,
  nameOf,
  sameLines,
  type LayoutDiff,
  type Pair,
} from './diff';
import type { Layout, LayoutNode, Rect } from './types';

/** Per channel, how far a moved pixel may be from its source and still count as the same. */
const TOLERANCE = 3;
/** The same for a move by a fraction of a pixel, on a 3x3 average. */
const LOOSE = 24;
/** Doubt areas smaller than this many pixels are noise. */
const MIN_DOUBT_AREA = 16;
/** A DOM change needs this many differing pixels on its box to count. */
const MIN_PIXELS_ON_CHANGE = 8;

type Status = 'static' | 'changed' | 'trust' | 'moved';
type Item = { kind: Status; d: [number, number] | null; node: LayoutNode };
type Owners = { owner: Int32Array; under: Int32Array; items: Item[] };
type Verdict = 'verified' | 'approx' | 'trust' | 'unverified';

const preorder = (node: LayoutNode, out: LayoutNode[] = []) => {
  out.push(node);
  node.kids.forEach((kid) => preorder(kid, out));
  return out;
};

const px32 = ({ data }: RgbaImage) =>
  new Uint32Array(data.buffer, data.byteOffset, data.length / 4);

const near = (a: number, b: number, tol: number) =>
  a === b ||
  (Math.abs((a & 255) - (b & 255)) <= tol &&
    Math.abs(((a >>> 8) & 255) - ((b >>> 8) & 255)) <= tol &&
    Math.abs(((a >>> 16) & 255) - ((b >>> 16) & 255)) <= tol);

const mean = (
  img: Uint32Array,
  w: number,
  h: number,
  x: number,
  y: number,
): [number, number, number] => {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const xx = x + i;
      const yy = y + j;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const v = img[yy * w + xx];
      r += v & 255;
      g += (v >>> 8) & 255;
      b += (v >>> 16) & 255;
      n++;
    }
  }
  return [r / n, g / n, b / n];
};

/** For every pixel: the item (element box or text line) drawn there last, and the one under it. */
const owners = (
  root: LayoutNode,
  side: 'a' | 'b',
  pairOf: Map<LayoutNode, Pair>,
  w: number,
  h: number,
  scale: number,
): Owners => {
  const owner = new Int32Array(w * h).fill(-1);
  const under = new Int32Array(w * h).fill(-1);
  const items: Item[] = [];
  const fill = ([x, y, bw, bh]: Rect, item: Item) => {
    const x0 = Math.max(0, Math.floor(x * scale));
    const y0 = Math.max(0, Math.floor(y * scale));
    const x1 = Math.min(w, Math.ceil((x + bw) * scale));
    const y1 = Math.min(h, Math.ceil((y + bh) * scale));
    if (x1 <= x0 || y1 <= y0) return;
    const index = items.push(item) - 1;
    for (let yy = y0; yy < y1; yy++) {
      under.set(owner.subarray(yy * w + x0, yy * w + x1), yy * w + x0);
      owner.fill(index, yy * w + x0, yy * w + x1);
    }
  };
  for (const node of preorder(root)) {
    const pair = pairOf.get(node);
    if (node.hidden || !pair || pair.kinds.length === 0) {
      // nothing happened to it, but it still covers what is below
      if (!node.hidden && pair && node.box) {
        fill(node.rect, { kind: 'static', d: null, node });
      }
      if (!node.hidden && node.text && node.lines) {
        node.lines.forEach((line) =>
          fill(line, { kind: 'static', d: null, node }),
        );
      }
      continue;
    }
    const { a, b } = pair;
    const other = side === 'a' ? b : a;
    const changed = has(pair, ['added', 'removed', 'text', 'look']);
    if (node.box) {
      let kind: Status = 'static';
      let d: [number, number] | null = null;
      if (changed) kind = 'changed';
      else if (pair.kinds.includes('resized')) kind = 'trust';
      else if (pair.kinds.includes('moved') && a && b) {
        kind = 'moved';
        d = [b.rect[0] - a.rect[0], b.rect[1] - a.rect[1]];
      }
      fill(node.rect, { kind, d, node });
    }
    if (node.text && node.lines) {
      const same =
        !!other && !changed && !!a && !!b && sameLines(a.lines, b.lines);
      node.lines.forEach((line, i) => {
        if (changed) return fill(line, { kind: 'changed', d: null, node });
        if (!same || !a?.lines || !b?.lines) {
          return fill(line, { kind: 'trust', d: null, node });
        }
        const d: [number, number] = [
          b.lines[i][0] - a.lines[i][0],
          b.lines[i][1] - a.lines[i][1],
        ];
        const still = Math.abs(d[0]) < EPS && Math.abs(d[1]) < EPS;
        fill(line, { kind: still ? 'static' : 'moved', d, node });
      });
    }
  }
  return { owner, under, items };
};

/** The share of differing pixels in each state of the check. */
export type Shares = Record<
  'verified' | 'approx' | 'trust' | 'changed' | 'doubt',
  number
>;

export type Checked = {
  /** `changed` or `moved`-only, after the pixels had their say. */
  verdict: 'changed' | 'moved' | 'partly';
  shares: Shares;
  /** Areas of differing pixels the DOM cannot explain. */
  doubt: Region[];
  /** Pairs with a change that has differing pixels on it. */
  real: Pair[];
  /** DOM changes without pixels (an invisible layer, a comment). */
  ignored: number;
  /** What each doubt area sits on, by element name. */
  doubtOn: string[];
};

/**
 * Checks what the layout diff says against the pixels: for every differing
 * pixel, the element drawn there either did something the diff names, or it
 * moved and the pixel equals the other image at its offset. A differing pixel
 * nothing explains turns "only moved" into "partly".
 */
export const checkAgainstPixels = ({
  diff,
  before,
  after,
  baseline,
  actual,
  mask,
}: {
  diff: LayoutDiff;
  before: Layout;
  after: Layout;
  baseline: RgbaImage;
  actual: RgbaImage;
  mask: Uint8Array;
}): Checked => {
  const { width: w, height: h } = actual;
  const scaleA = before.scale;
  const scaleB = after.scale;
  const scale = scaleB;
  const base = px32(baseline);
  const act = px32(actual);
  const pairA = new Map<LayoutNode, Pair>();
  const pairB = new Map<LayoutNode, Pair>();
  for (const pair of diff.pairs) {
    if (pair.a) pairA.set(pair.a, pair);
    if (pair.b) pairB.set(pair.b, pair);
  }
  const A = owners(before.root, 'a', pairA, w, h, scaleA);
  const B = owners(after.root, 'b', pairB, w, h, scaleB);

  // does `from` at (x, y) equal `to` at (x, y) + sign * d?
  const check = (
    from: Uint32Array,
    to: Uint32Array,
    x: number,
    y: number,
    d: [number, number],
    sign: 1 | -1,
  ): Verdict => {
    const tx = x + sign * d[0] * scale;
    const ty = y + sign * d[1] * scale;
    const whole =
      Math.abs(tx - Math.round(tx)) < EPS * scale &&
      Math.abs(ty - Math.round(ty)) < EPS * scale;
    const v = from[y * w + x];
    for (const cx of whole
      ? [Math.round(tx)]
      : [Math.floor(tx), Math.ceil(tx)]) {
      for (const cy of whole
        ? [Math.round(ty)]
        : [Math.floor(ty), Math.ceil(ty)]) {
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) continue;
        if (near(v, to[cy * w + cx], TOLERANCE)) return 'verified';
      }
    }
    const rx = Math.round(tx);
    const ry = Math.round(ty);
    if (rx < 0 || ry < 0 || rx >= w || ry >= h) return 'trust'; // outside the picture
    if (!whole) {
      const m1 = mean(from, w, h, x, y);
      const m2 = mean(to, w, h, rx, ry);
      if (m1.every((c, i) => Math.abs(c - m2[i]) <= LOOSE)) return 'approx';
    }
    return 'unverified';
  };

  type State = Verdict | 'static' | 'changed';
  const status = (
    item: Item | undefined,
    from: Uint32Array,
    to: Uint32Array,
    x: number,
    y: number,
    sign: 1 | -1,
  ): State => {
    if (!item) return 'static';
    if (item.kind === 'static') return 'static';
    if (item.kind === 'changed' || item.kind === 'trust') return item.kind;
    return check(from, to, x, y, item.d as [number, number], sign);
  };
  // rounded corners and gaps between letters show the layer beneath
  const through = (
    S: Owners,
    at: number,
    from: Uint32Array,
    to: Uint32Array,
    x: number,
    y: number,
    sign: 1 | -1,
  ): State => {
    const top = status(S.items[S.owner[at]], from, to, x, y, sign);
    if (top !== 'unverified' && top !== 'static') return top;
    const below = status(S.items[S.under[at]], from, to, x, y, sign);
    if (below === 'verified' || below === 'approx') return below;
    if (top === 'unverified' && below === 'static') return 'verified';
    return top;
  };

  const count = { verified: 0, approx: 0, trust: 0, changed: 0, doubt: 0 };
  const leftDoubt = new Uint8Array(w * h);
  let total = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const at = y * w + x;
      if (!mask[at]) continue;
      total++;
      const old = through(A, at, base, act, x, y, 1); // where the old content went
      const now = through(B, at, act, base, x, y, -1); // where the new content came from
      if (old === 'changed' || now === 'changed') count.changed++;
      else if (old === 'unverified' || now === 'unverified') {
        count.doubt++;
        leftDoubt[at] = 1;
      } else if (old === 'static' && now === 'static') {
        count.doubt++; // nothing explains it
        leftDoubt[at] = 1;
      } else if (old === 'trust' || now === 'trust') count.trust++;
      else if (old === 'approx' || now === 'approx') count.approx++;
      else count.verified++;
    }
  }
  const doubt = findRegions(leftDoubt, w, h).regions.filter(
    (r) =>
      r.kind !== 'speck' &&
      r.area >= MIN_DOUBT_AREA &&
      (r.fillRatio >= 0.1 || r.area >= 400),
  );

  // a DOM change only counts when differing pixels sit on that element
  const sat = new Uint32Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      run += mask[y * w + x];
      sat[(y + 1) * (w + 1) + x + 1] = sat[y * (w + 1) + x + 1] + run;
    }
  }
  const inBox = (n: LayoutNode | null, k: number) => {
    if (!n || n.hidden) return 0;
    const x0 = Math.max(0, Math.floor(n.rect[0] * k));
    const y0 = Math.max(0, Math.floor(n.rect[1] * k));
    const x1 = Math.min(w, Math.ceil((n.rect[0] + n.rect[2]) * k));
    const y1 = Math.min(h, Math.ceil((n.rect[1] + n.rect[3]) * k));
    if (x1 <= x0 || y1 <= y0) return 0;
    return (
      sat[y1 * (w + 1) + x1] -
      sat[y0 * (w + 1) + x1] -
      sat[y1 * (w + 1) + x0] +
      sat[y0 * (w + 1) + x0]
    );
  };
  const real = diff.changed.filter(
    (p) => inBox(p.a, scaleA) + inBox(p.b, scaleB) >= MIN_PIXELS_ON_CHANGE,
  );
  const hasLayout = diff.layout.length > 0;
  let verdict: Checked['verdict'] = real.length
    ? hasLayout
      ? 'partly'
      : 'changed'
    : hasLayout
      ? 'moved'
      : 'changed';
  if (verdict === 'moved' && doubt.length) verdict = 'partly'; // the pixels disagree with the DOM

  const doubtOn = doubt.slice(0, 4).map((r) => {
    const tally = new Map<string, number>();
    for (let y = r.y; y < r.y + r.height; y++) {
      for (let x = r.x; x < r.x + r.width; x++) {
        if (!leftDoubt[y * w + x]) continue;
        const item = B.items[B.owner[y * w + x]];
        const name = item ? nameOf(item.node) : 'the page';
        tally.set(name, (tally.get(name) ?? 0) + 1);
      }
    }
    return [...tally].sort((m, n) => n[1] - m[1])[0]?.[0] ?? 'the page';
  });

  const share = (n: number) => (total === 0 ? 0 : n / total);
  return {
    verdict,
    shares: {
      verified: share(count.verified),
      approx: share(count.approx),
      trust: share(count.trust),
      changed: share(count.changed),
      doubt: share(count.doubt),
    },
    doubt,
    real,
    ignored: diff.changed.length - real.length,
    doubtOn,
  };
};

/** Names the elements behind the changes: `text div.price "24.99"`. */
export const causesOf = (pairs: Pair[], limit = 3): string[] =>
  pairs.slice(0, limit).map((pair) => {
    const kinds = pair.kinds.filter((kind) => CHANGE.includes(kind));
    return `${kinds.join('+')} ${nameOf((pair.b ?? pair.a) as LayoutNode)}`;
  });
