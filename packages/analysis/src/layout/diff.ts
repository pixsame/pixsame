import type { Layout, LayoutNode, Rect } from './types';

/** What happened to an element between the baseline and the screenshot. */
export type Kind =
  | 'added'
  | 'removed'
  | 'text'
  | 'look'
  | 'font'
  | 'entered'
  | 'moved'
  | 'resized'
  | 'rewrapped';

/** Kinds that mean new or different content, as opposed to the same content elsewhere. */
export const CHANGE: Kind[] = [
  'added',
  'removed',
  'text',
  'look',
  'font',
  'entered',
];
export const LAYOUT: Kind[] = ['moved', 'resized', 'rewrapped'];

/** One element in both snapshots; one side is missing when it was added or removed. */
export type Pair = {
  a: LayoutNode | null;
  b: LayoutNode | null;
  kinds: Kind[];
};

export type LayoutDiff = {
  pairs: Pair[];
  /** Pairs with new or different content. */
  changed: Pair[];
  /** Pairs that only moved, resized or re-wrapped. */
  layout: Pair[];
};

/** Positions closer than this (CSS pixels) are the same position. */
export const EPS = 0.05;

const fnv = (text: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  }
  return h >>> 0;
};

const contents = new WeakMap<LayoutNode, number>();
const content = (n: LayoutNode): number => {
  let hash = contents.get(n);
  if (hash === undefined) {
    hash = fnv(
      `${n.text ?? ''}|${n.src ?? ''}|${n.kids.map(content).join('/')}`,
    );
    contents.set(n, hash);
  }
  return hash;
};
const sig = (n: LayoutNode) => `${n.tag}#${n.id ?? ''}|${content(n)}`;
/** The same, and the class names: tells apart siblings that look alike. */
const sigClass = (n: LayoutNode) => `${sig(n)}|${n.cls ?? ''}`;

/** Index pairs of a longest common subsequence of two lists. */
const lcsPairs = (a: string[], b: string[]): [number, number][] => {
  const n = a.length;
  const m = b.length;
  const t = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      t[i][j] =
        a[i] === b[j]
          ? t[i + 1][j + 1] + 1
          : Math.max(t[i + 1][j], t[i][j + 1]);
    }
  }
  const out: [number, number][] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) out.push([i++, j++]);
    else if (t[i + 1][j] >= t[i][j + 1]) i++;
    else j++;
  }
  return out;
};

/** Lists longer than this are matched without the quadratic common-subsequence table. */
const LCS_LIMIT = 2000;

const orderedPairs = (a: string[], b: string[]): [number, number][] => {
  if (a.length * b.length <= LCS_LIMIT * LCS_LIMIT) return lcsPairs(a, b);
  // very long lists: walk in step, jumping to the next equal signature
  const out: [number, number][] = [];
  let j = 0;
  for (let i = 0; i < a.length; i++) {
    const at = b.indexOf(a[i], j);
    if (at >= 0) {
      out.push([i, at]);
      j = at + 1;
    }
  }
  return out;
};

const gone = (node: LayoutNode, side: 'a' | 'b', pairs: Pair[]) => {
  pairs.push({
    a: side === 'a' ? node : null,
    b: side === 'b' ? node : null,
    kinds: [],
  });
  node.kids.forEach((kid) => gone(kid, side, pairs));
};

const match = (a: LayoutNode, b: LayoutNode, pairs: Pair[]) => {
  pairs.push({ a, b, kinds: [] });
  const usedA = new Set<number>();
  const usedB = new Set<number>();
  const take = (i: number, j: number) => {
    usedA.add(i);
    usedB.add(j);
    match(a.kids[i], b.kids[j], pairs);
  };
  // same content and classes, same order; then same content, whatever the classes
  for (const key of [sigClass, sig]) {
    const left = a.kids.map((_, i) => i).filter((i) => !usedA.has(i));
    const right = b.kids.map((_, j) => j).filter((j) => !usedB.has(j));
    for (const [i, j] of orderedPairs(
      left.map((i) => key(a.kids[i])),
      right.map((j) => key(b.kids[j])),
    )) {
      take(left[i], right[j]);
    }
  }
  // same content, another place (a reordered list)
  const free = new Map<string, number[]>();
  b.kids.forEach((kid, j) => {
    if (usedB.has(j)) return;
    const key = sig(kid);
    free.set(key, [...(free.get(key) ?? []), j]);
  });
  a.kids.forEach((kid, i) => {
    if (usedA.has(i)) return;
    const j = free.get(sig(kid))?.shift();
    if (j !== undefined) take(i, j);
  });
  // same tag, in order (the content changed)
  a.kids.forEach((kid, i) => {
    if (usedA.has(i)) return;
    const j = b.kids.findIndex(
      (other, at) => !usedB.has(at) && other.tag === kid.tag,
    );
    if (j >= 0) take(i, j);
  });
  a.kids.forEach((kid, i) => usedA.has(i) || gone(kid, 'a', pairs));
  b.kids.forEach((kid, j) => usedB.has(j) || gone(kid, 'b', pairs));
};

type Area = [number, number];

const inArea = (n: LayoutNode | null, [w, h]: Area): n is LayoutNode =>
  !!n &&
  !n.hidden &&
  n.rect[0] < w &&
  n.rect[1] < h &&
  n.rect[0] + n.rect[2] > 0 &&
  n.rect[1] + n.rect[3] > 0;

const draws = (n: LayoutNode | null) => !!n && !!(n.box || n.text);

/** How much of the element lies outside the area: left, top, right, bottom. */
const cut = (n: LayoutNode, [w, h]: Area) => [
  Math.max(0, -n.rect[0]),
  Math.max(0, -n.rect[1]),
  Math.max(0, n.rect[0] + n.rect[2] - w),
  Math.max(0, n.rect[1] + n.rect[3] - h),
];

export const sameLines = (a: Rect[] = [], b: Rect[] = []) =>
  a.length === b.length &&
  a.every((line, i) => Math.abs(line[2] - b[i][2]) < 0.5);

const classify = (pair: Pair, areaA: Area, areaB: Area) => {
  const { a, b } = pair;
  const seenA = inArea(a, areaA);
  const seenB = inArea(b, areaB);
  if (!seenA && !seenB) return;
  if (!draws(a) && !draws(b)) return;
  const add = (kind: Kind) => pair.kinds.push(kind);
  if (!a || a.hidden) return add('added');
  if (!b || b.hidden) return add('removed');
  if ((a.text ?? '') !== (b.text ?? '')) add('text');
  if (a.paint !== b.paint || a.src !== b.src || !!a.box !== !!b.box) {
    add('look');
  }
  // the font family is its own kind: another system picks another default font
  if ((a.font ?? '') !== (b.font ?? '')) add('font');
  const moved =
    Math.abs(a.rect[0] - b.rect[0]) > EPS ||
    Math.abs(a.rect[1] - b.rect[1]) > EPS;
  const resized =
    Math.abs(a.rect[2] - b.rect[2]) > EPS ||
    Math.abs(a.rect[3] - b.rect[3]) > EPS;
  if (resized && (a.scales || b.scales)) add('look'); // a stretched picture or gradient
  if (a.text && b.text && a.text === b.text && !sameLines(a.lines, b.lines)) {
    add('rewrapped');
  }
  if (resized) add('resized');
  else if (moved) add('moved');
  // more of it is inside the picture than before: pixels nobody has seen
  if (a.text || a.media) {
    const before = seenA
      ? cut(a, areaA)
      : [Infinity, Infinity, Infinity, Infinity];
    const after = seenB ? cut(b, areaB) : before;
    if (!seenA || after.some((v, i) => v < before[i] - 0.5)) add('entered');
  }
};

export const has = (pair: Pair, kinds: Kind[]) =>
  pair.kinds.some((kind) => kinds.includes(kind));

/** Which elements are which in two snapshots, and what happened to each. */
// one comparison is described more than once (a sentence, then the facts):
// the same two snapshots give the same answer, which nobody changes
const known = new WeakMap<Layout, WeakMap<Layout, LayoutDiff>>();

export const diffLayouts = (before: Layout, after: Layout): LayoutDiff => {
  const seen = known.get(before)?.get(after);
  if (seen) return seen;
  const made = diffNew(before, after);
  if (!known.has(before)) known.set(before, new WeakMap());
  known.get(before)?.set(after, made);
  return made;
};

const diffNew = (before: Layout, after: Layout): LayoutDiff => {
  const pairs: Pair[] = [];
  match(before.root, after.root, pairs);
  const areaA: Area = [before.size.width, before.size.height];
  const areaB: Area = [after.size.width, after.size.height];
  pairs.forEach((pair) => classify(pair, areaA, areaB));
  return {
    pairs,
    changed: pairs.filter((pair) => has(pair, CHANGE)),
    layout: pairs.filter((pair) => !has(pair, CHANGE) && has(pair, LAYOUT)),
  };
};

/** A short name for an element in a sentence: `div.price "24.99"`. */
export const nameOf = (n: LayoutNode): string =>
  `${n.tag}${n.id ? `#${n.id}` : n.cls ? `.${n.cls.split(' ')[0]}` : ''}${n.text ? ` "${n.text.slice(0, 18)}"` : ''}`;
