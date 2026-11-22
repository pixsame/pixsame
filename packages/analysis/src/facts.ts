import { analyze } from './analyze';
import {
  CHANGE,
  diffLayouts,
  EPS,
  has,
  nameOf,
  type Kind,
  type Pair,
} from './layout/diff';
import type { Layout, LayoutNode, Rect } from './layout/types';
import { checkAgainstPixels } from './layout/verify';
import type { Region, RgbaImage, Size } from './types';

/**
 * One thing that is different between two screenshots, small enough to act
 * on. `text` is the sentence; the other fields are the same thing as data.
 */
type FactBody =
  /** An element was added, removed, or its text or look changed. */
  | {
      type: 'element';
      kinds: Kind[];
      element: string;
      /** Where it is in the screenshot (where it was, when removed), in CSS pixels. */
      rect: Rect;
      before?: string;
      after?: string;
      text: string;
    }
  /** Elements that kept their content and moved by the same offset, in CSS pixels. */
  | {
      type: 'move';
      dx: number;
      dy: number;
      elements: number;
      /** The first of them, outermost first. */
      first: string[];
      text: string;
    }
  /** An element that kept its content and position and changed its size or line breaks. */
  | {
      type: 'resize';
      kinds: Kind[];
      element: string;
      rect: Rect;
      before: Size;
      after: Size;
      text: string;
    }
  /** Pixels differ and the page's layout does not say why (a canvas, a picture, a video frame). In image pixels. */
  | { type: 'area'; area: Region; on?: string; text: string }
  /** The screenshot itself has another size. */
  | { type: 'size'; before: Size; after: Size; text: string }
  /** No layout to go by: what the pixels alone say. */
  | { type: 'pixels'; label: string; text: string };

export type Fact = FactBody & {
  /**
   * Set when `only` was given: `true` when this is not on one of those
   * elements and not a move one of them caused.
   */
  outside?: boolean;
};

export type FactsInput = {
  /** Both images as they were compared: the same size. */
  baseline: RgbaImage;
  actual: RgbaImage;
  /** 1 for every pixel that counted as different, row by row. */
  mask: Uint8Array;
  /** The sizes before any padding or cropping, when known. */
  sizes?: { baseline: Size; actual: Size };
  /** What the page looked like when each screenshot was taken. */
  layout?: { baseline: Layout; actual: Layout };
  /**
   * The elements that were meant to change, as their rectangles in the actual
   * screenshot (CSS pixels). Every fact then says whether it is `outside` them.
   */
  only?: Rect[];
};

/** Rectangles closer than this (CSS pixels) are the same rectangle. */
const SAME_RECT = 0.5;

const within = (inner: Rect, outer: Rect, slack = SAME_RECT) =>
  inner[0] >= outer[0] - slack &&
  inner[1] >= outer[1] - slack &&
  inner[0] + inner[2] <= outer[0] + outer[2] + slack &&
  inner[1] + inner[3] <= outer[1] + outer[3] + slack;

type Root = {
  a: LayoutNode | null;
  b: LayoutNode;
  /** It is new, or its content or look changed: a reason of its own to be elsewhere. */
  changed: boolean;
};
type Scope = {
  rects: Rect[];
  roots: Root[];
  inA: Set<LayoutNode>;
  inB: Set<LayoutNode>;
  /** For every element inside an `only` element, which one. */
  rootOf: Map<LayoutNode, Root>;
};

/** The `only` rectangles as elements of both snapshots, with everything inside them. */
const scopeOf = (only: Rect[], after: Layout, pairs: Pair[]): Scope => {
  const pairOf = new Map<LayoutNode, Pair>();
  for (const pair of pairs) if (pair.b) pairOf.set(pair.b, pair);
  const scope: Scope = {
    rects: only,
    roots: [],
    inA: new Set(),
    inB: new Set(),
    rootOf: new Map(),
  };
  const addAll = (node: LayoutNode, to: Set<LayoutNode>, root?: Root) => {
    to.add(node);
    if (root) scope.rootOf.set(node, root);
    node.kids.forEach((kid) => addAll(kid, to, root));
  };
  const visit = (node: LayoutNode) => {
    const same = only.some((rect) =>
      rect.every((value, i) => Math.abs(value - node.rect[i]) <= SAME_RECT),
    );
    // the outermost element with that rectangle: what is inside it comes along
    if (!same) return node.kids.forEach(visit);
    const pair = pairOf.get(node);
    const a = pair?.a ?? null;
    const root = { a, b: node, changed: !a || (!!pair && has(pair, CHANGE)) };
    scope.roots.push(root);
    addAll(node, scope.inB, root);
    if (a) addAll(a, scope.inA);
  };
  visit(after.root);
  return scope;
};

const outsidePair = ({ a, b }: Pair, scope: Scope) => {
  if ((b && scope.inB.has(b)) || (a && scope.inA.has(a))) return false;
  // an element the snapshot holds no root for (a shadow tree): go by its place
  const node = (b ?? a) as LayoutNode;
  return !scope.rects.some((rect) => within(node.rect, rect));
};

const sized = ({ a, b }: Root, axis: 0 | 1) =>
  !a || Math.abs(b.rect[axis + 2] - a.rect[axis + 2]) > EPS;

/**
 * Whether one of the `only` elements pushed this element: that element is new
 * or changed size along the axis, and this one started at or past its top
 * (left) edge.
 */
const pushed = (
  { a, b }: { a: LayoutNode | null; b: LayoutNode | null },
  scope: Scope,
  except?: Root,
) => {
  if (!a || !b) return false;
  const dx = Math.abs(b.rect[0] - a.rect[0]) > SAME_RECT;
  const dy = Math.abs(b.rect[1] - a.rect[1]) > SAME_RECT;
  return scope.roots.some((root) => {
    if (root === except) return false;
    const from = (root.a ?? root.b).rect;
    const disturbed = (axis: 0 | 1) => sized(root, axis);
    return (
      (!dy || (disturbed(1) && a.rect[1] >= from[1] - SAME_RECT)) &&
      (!dx || (disturbed(0) && a.rect[0] >= from[0] - SAME_RECT))
    );
  });
};

/**
 * Whether a move is not the doing of the `only` elements. One of them that
 * sits elsewhere with nothing about it changed was moved by something else
 * (a neighbour's margin, say), and so was all it holds.
 */
const outsideMove = (pair: Pair, scope: Scope) => {
  const root = pair.b ? scope.rootOf.get(pair.b) : undefined;
  if (!root) return outsidePair(pair, scope) && !pushed(pair, scope);
  const { a, b } = root;
  const drifted =
    !!a &&
    !root.changed &&
    !sized(root, 0) &&
    !sized(root, 1) &&
    (Math.abs(b.rect[0] - a.rect[0]) > SAME_RECT ||
      Math.abs(b.rect[1] - a.rect[1]) > SAME_RECT);
  return drifted && !pushed(root, scope, root);
};

const OFFSET_STEP = 0.1;
const FIRST_NAMES = 3;

const round = (n: number) => Number(n.toFixed(1));

const direction = (dx: number, dy: number) =>
  [
    ...(dy !== 0 ? [`${dy > 0 ? 'down' : 'up'} by ${Math.abs(dy)} px`] : []),
    ...(dx !== 0 ? [`${dx > 0 ? 'right' : 'left'} by ${Math.abs(dx)} px`] : []),
  ].join(' and ');

const quote = (text?: string) => JSON.stringify(text ?? '');

const elementFact = (pair: Pair): FactBody => {
  const node = (pair.b ?? pair.a) as LayoutNode;
  const kinds = pair.kinds.filter((kind) => CHANGE.includes(kind));
  const element = nameOf(node);
  const parts: string[] = [];
  if (kinds.includes('added')) parts.push(`added ${element}`);
  if (kinds.includes('removed')) parts.push(`removed ${element}`);
  if (kinds.includes('entered')) parts.push(`${element} came into view`);
  const { a, b } = pair;
  const textChanged = kinds.includes('text') && a && b;
  if (textChanged) {
    parts.push(`text changed on ${b.tag}: ${quote(a.text)} → ${quote(b.text)}`);
  }
  if (kinds.includes('look')) parts.push(`look changed on ${element}`);
  if (a && b && pair.kinds.includes('resized')) {
    parts.push(
      `resized ${round(a.rect[2])}x${round(a.rect[3])} → ${round(b.rect[2])}x${round(b.rect[3])}`,
    );
  }
  return {
    type: 'element',
    kinds,
    element,
    rect: node.rect,
    ...(textChanged && { before: a.text ?? '', after: b.text ?? '' }),
    text: parts.join('; '),
  };
};

const moveFacts = (pairs: Pair[], scope?: Scope): Fact[] => {
  const tally = new Map<
    string,
    {
      dx: number;
      dy: number;
      elements: number;
      first: string[];
      outside?: boolean;
    }
  >();
  for (const pair of pairs) {
    const { a, b, kinds } = pair;
    if (!a || !b || !kinds.includes('moved')) continue;
    const dx = round(
      Math.round((b.rect[0] - a.rect[0]) / OFFSET_STEP) * OFFSET_STEP,
    );
    const dy = round(
      Math.round((b.rect[1] - a.rect[1]) / OFFSET_STEP) * OFFSET_STEP,
    );
    if (dx === 0 && dy === 0) continue;
    const outside = scope && outsideMove(pair, scope);
    const key = `${dx},${dy},${outside}`;
    const entry = tally.get(key) ?? {
      dx,
      dy,
      elements: 0,
      first: [],
      ...(scope && { outside }),
    };
    entry.elements++;
    if (entry.first.length < FIRST_NAMES) entry.first.push(nameOf(b));
    tally.set(key, entry);
  }
  return [...tally.values()]
    .sort((m, n) => n.elements - m.elements)
    .map((move) => ({
      type: 'move' as const,
      ...move,
      text: `${move.elements === 1 ? '1 element' : `${move.elements} elements`} moved ${direction(move.dx, move.dy)}: ${move.first.join(', ')}${move.elements > move.first.length ? ', …' : ''}`,
    }));
};

/**
 * Elements that only changed size or line breaks, and only the innermost
 * ones: a page that grows resizes every ancestor of what grew, and naming
 * those says nothing.
 */
const resizeFacts = (
  pairs: Pair[],
  touched: Set<LayoutNode>,
  scope?: Scope,
): Fact[] => {
  const inside = (node: LayoutNode): boolean =>
    node.kids.some((kid) => touched.has(kid) || inside(kid));
  const out: Fact[] = [];
  for (const pair of pairs) {
    const { a, b, kinds } = pair;
    if (!a || !b || kinds.includes('moved')) continue;
    const resized = kinds.includes('resized');
    const rewrapped = kinds.includes('rewrapped');
    if ((!resized && !rewrapped) || inside(b)) continue;
    const before = { width: round(a.rect[2]), height: round(a.rect[3]) };
    const after = { width: round(b.rect[2]), height: round(b.rect[3]) };
    const element = nameOf(b);
    const parts = [
      ...(resized
        ? [
            `${element} resized ${before.width}x${before.height} → ${after.width}x${after.height}`,
          ]
        : []),
      ...(rewrapped
        ? [
            `${resized ? 'its text' : `text of ${element}`} wraps onto ${b.lines?.length ?? 0} ${b.lines?.length === 1 ? 'line' : 'lines'} (was ${a.lines?.length ?? 0})`,
          ]
        : []),
    ];
    out.push({
      type: 'resize',
      kinds: kinds.filter((kind) => kind === 'resized' || kind === 'rewrapped'),
      element,
      rect: b.rect,
      before,
      after,
      text: parts.join('; '),
      ...(scope && { outside: outsidePair(pair, scope) }),
    });
  }
  return out;
};

/** Whether an area (image pixels) lies inside one of the rectangles (CSS pixels). */
const areaInside = (area: Region, rects: Rect[], scale: number) =>
  rects.some((rect) =>
    within(
      [area.x / scale, area.y / scale, area.width / scale, area.height / scale],
      rect,
      1,
    ),
  );

const areaText = (area: Region, on?: string) =>
  `pixels changed in ${area.width}x${area.height} px at x=${area.x}, y=${area.y}${on ? ` on ${on}` : ''}, and the page's layout does not say why`;

/**
 * Everything that is different between two screenshots, one fact each:
 * changed elements first, then moves (one per offset, however many elements),
 * then elements that changed size, then areas the layout cannot explain.
 * With no layout snapshot on both sides it is what the pixels alone say.
 * Deterministic; an empty mask gives no facts.
 */
export const facts = ({
  baseline,
  actual,
  mask,
  sizes,
  layout,
  only,
}: FactsInput): Fact[] => {
  if (!mask.includes(1)) return [];
  const out: Fact[] = [];
  if (
    sizes &&
    (sizes.baseline.width !== sizes.actual.width ||
      sizes.baseline.height !== sizes.actual.height)
  ) {
    out.push({
      type: 'size',
      before: sizes.baseline,
      after: sizes.actual,
      text: `the screenshot changed size ${sizes.baseline.width}x${sizes.baseline.height} → ${sizes.actual.width}x${sizes.actual.height}`,
    });
  }
  const usable =
    layout && layout.baseline.size.width > 0 && layout.actual.size.width > 0;
  if (!usable) {
    const { label, description, regions } = analyze({
      baseline,
      actual,
      mask,
      sizes,
    });
    out.push({ type: 'pixels', label, text: description });
    if (label !== 'noise-like') {
      for (const area of regions) {
        if (area.kind === 'speck') continue;
        out.push({
          type: 'area',
          area,
          text: `pixels changed in ${area.width}x${area.height} px at x=${area.x}, y=${area.y}`,
          // without a layout the image is taken to be at scale 1
          ...(only && { outside: !areaInside(area, only, 1) }),
        });
      }
    }
    return out;
  }
  const diff = diffLayouts(layout.baseline, layout.actual);
  const checked = checkAgainstPixels({
    diff,
    before: layout.baseline,
    after: layout.actual,
    baseline,
    actual,
    mask,
  });
  const scope = only && scopeOf(only, layout.actual, diff.pairs);
  out.push(
    ...checked.real.map((pair) => ({
      ...elementFact(pair),
      ...(scope && { outside: outsidePair(pair, scope) }),
    })),
  );
  const layoutOnly = diff.layout.filter((pair) => !has(pair, CHANGE));
  out.push(...moveFacts(layoutOnly, scope));
  const touched = new Set<LayoutNode>();
  for (const pair of [...diff.changed, ...diff.layout]) {
    if (pair.b) touched.add(pair.b);
  }
  out.push(...resizeFacts(layoutOnly, touched, scope));
  checked.doubt.forEach((area, i) => {
    const on = checked.doubtOn[i];
    out.push({
      type: 'area',
      area,
      ...(on && { on }),
      text: areaText(area, on),
      ...(scope && {
        outside: !areaInside(
          area,
          [
            ...scope.rects,
            ...scope.roots.flatMap(({ a }) => (a ? [a.rect] : [])),
          ],
          layout.actual.scale,
        ),
      }),
    });
  });
  if (scope && out[0]?.type === 'size') {
    // an element capture grows with its element
    out[0].outside = !scope.roots.some(
      ({ a, b }) =>
        !a ||
        Math.abs(a.rect[2] - b.rect[2]) > EPS ||
        Math.abs(a.rect[3] - b.rect[3]) > EPS,
    );
  }
  return out;
};
