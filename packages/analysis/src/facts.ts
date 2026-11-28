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
import {
  describeStyleChanges,
  SPACING,
  styleChanges,
  type StyleChange,
} from './layout/style';
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
      /** The stored styles that have another value, when the snapshots hold them. */
      styles?: StyleChange[];
      text: string;
    }
  /** An element whose spacing (margin, padding, gap) changed and that shows no other change of its own: what it did is in the moves and resizes around it. */
  | {
      type: 'style';
      element: string;
      rect: Rect;
      styles: StyleChange[];
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
      /** Where each of `first` is now, in CSS pixels. */
      rects?: Rect[];
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
      styles?: StyleChange[];
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
   * Set when the pixels of this change differ by less than a test counts:
   * it is there, and a comparison in a test would pass over it.
   */
  faint?: boolean;
  /**
   * Set when the pixels of this change were left out as `unseen`: it is
   * what the layout says, and no pixel was looked at.
   */
  unseen?: boolean;
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
  /**
   * 1 for every pixel that differs at all, also by less than `mask` counts.
   * With it, changes the layout names are reported when only such pixels
   * show them, marked `faint`. Without it they are left out.
   */
  faint?: Uint8Array;
  /**
   * 1 for every pixel that is in neither mask because it changes by itself
   * (it differed between two captures of the same page). A change the layout
   * names on an element there is reported from the layout alone, marked
   * `unseen`. Without it such a change is left out.
   */
  unseen?: Uint8Array;
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
  /** It is new, or its content, look or a style of its own changed: a reason of its own to be elsewhere. */
  changed: boolean;
  /** Its own margin, padding or gap changed: it can push its neighbours without changing size. */
  spaced: boolean;
};

/** The style changes of a pair's element; see `styleChanges`. */
type Styles = (pair: Pair) => StyleChange[];

const own = (changes: StyleChange[]) => changes.filter(({ from }) => !from);
const spacing = (changes: StyleChange[]) =>
  own(changes).filter(({ property }) => SPACING.includes(property));
type Scope = {
  rects: Rect[];
  roots: Root[];
  inA: Set<LayoutNode>;
  inB: Set<LayoutNode>;
  /** For every element inside an `only` element, which one. */
  rootOf: Map<LayoutNode, Root>;
};

/** The `only` rectangles as elements of both snapshots, with everything inside them. */
const scopeOf = (
  only: Rect[],
  after: Layout,
  pairs: Pair[],
  styles: Styles,
): Scope => {
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
    const changes = pair ? styles(pair) : [];
    const root = {
      a,
      b: node,
      changed: !a || (!!pair && has(pair, CHANGE)) || own(changes).length > 0,
      spaced: spacing(changes).length > 0,
    };
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
 * Whether one of the `only` elements pushed this element: that element is
 * new, changed size along the axis or changed its own spacing, and this one
 * started at or past its top (left) edge.
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
    const disturbed = (axis: 0 | 1) => root.spaced || sized(root, axis);
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

const FAINT = ' (faint: the pixels differ by less than a test counts)';
const UNSEEN =
  " (from the page's layout alone: the pixels there change by themselves)";
const OFFSET_STEP = 0.1;
const FIRST_NAMES = 3;

const round = (n: number) => Number(n.toFixed(1));

const direction = (dx: number, dy: number) =>
  [
    ...(dy !== 0 ? [`${dy > 0 ? 'down' : 'up'} by ${Math.abs(dy)} px`] : []),
    ...(dx !== 0 ? [`${dx > 0 ? 'right' : 'left'} by ${Math.abs(dx)} px`] : []),
  ].join(' and ');

const quote = (text?: string) => JSON.stringify(text ?? '');

const elementFact = (
  pair: Pair,
  styles: StyleChange[],
  inside = 0,
): FactBody => {
  const node = (pair.b ?? pair.a) as LayoutNode;
  const kinds = pair.kinds.filter((kind) => CHANGE.includes(kind));
  const element = nameOf(node);
  const parts: string[] = [];
  const held =
    inside > 0
      ? ` with the ${inside === 1 ? 'element' : `${inside} elements`} inside it`
      : '';
  if (kinds.includes('added')) parts.push(`added ${element}${held}`);
  if (kinds.includes('removed')) parts.push(`removed ${element}${held}`);
  if (kinds.includes('entered')) parts.push(`${element} came into view`);
  const { a, b } = pair;
  const textChanged = kinds.includes('text') && a && b;
  if (textChanged) {
    parts.push(`text changed on ${b.tag}: ${quote(a.text)} → ${quote(b.text)}`);
  }
  // with the values at hand the change is named; without them only that there is one
  const named = describeStyleChanges(styles);
  const look = kinds.includes('look') || kinds.includes('font');
  if (look && named) parts.push(`${element}: ${named}`);
  else if (look)
    parts.push(
      `${kinds.includes('look') ? 'look' : 'font'} changed on ${element}`,
    );
  else if (named) parts.push(named);
  if (a && b && pair.kinds.includes('resized')) {
    const was = `${round(a.rect[2])}x${round(a.rect[3])}`;
    const is = `${round(b.rect[2])}x${round(b.rect[3])}`;
    if (was !== is) parts.push(`resized ${was} → ${is}`);
  }
  return {
    type: 'element',
    kinds,
    element,
    rect: node.rect,
    ...(textChanged && { before: a.text ?? '', after: b.text ?? '' }),
    ...(styles.length > 0 && { styles }),
    text: parts.join('; '),
  };
};

/** A move smaller than this (CSS pixels) cannot be seen. */
const MIN_MOVE = 0.5;

const moveFacts = (
  pairs: Pair[],
  parentOf: (node: LayoutNode) => Pair | undefined,
  scope?: Scope,
): Fact[] => {
  const offset = ({ a, b }: Pair, axis: 0 | 1) =>
    a && b
      ? round(
          Math.round((b.rect[axis] - a.rect[axis]) / OFFSET_STEP) * OFFSET_STEP,
        )
      : 0;
  // the outermost element that went the same way at the same size: a row
  // that moved is named, not the icon and the label in it
  const mover = (pair: Pair, dx: number, dy: number): LayoutNode => {
    let top = pair.b as LayoutNode;
    let parent = parentOf(top);
    while (
      parent?.a &&
      parent.b &&
      offset(parent, 0) === dx &&
      offset(parent, 1) === dy &&
      Math.abs(parent.b.rect[2] - parent.a.rect[2]) <= EPS &&
      Math.abs(parent.b.rect[3] - parent.a.rect[3]) <= EPS
    ) {
      top = parent.b;
      parent = parentOf(top);
    }
    return top;
  };
  const tally = new Map<
    string,
    {
      dx: number;
      dy: number;
      elements: number;
      movers: Map<LayoutNode, number>;
      outside?: boolean;
    }
  >();
  for (const pair of pairs) {
    const { a, b, kinds } = pair;
    if (!a || !b || !kinds.includes('moved')) continue;
    const dx = offset(pair, 0);
    const dy = offset(pair, 1);
    if (Math.abs(dx) < MIN_MOVE && Math.abs(dy) < MIN_MOVE) continue;
    const outside = scope && outsideMove(pair, scope);
    const key = `${dx},${dy},${outside}`;
    const entry = tally.get(key) ?? {
      dx,
      dy,
      elements: 0,
      movers: new Map<LayoutNode, number>(),
      ...(scope && { outside }),
    };
    entry.elements++;
    const top = mover(pair, dx, dy);
    // a wrapper that draws nothing is not among the moved elements itself
    entry.movers.set(top, (entry.movers.get(top) ?? (top === b ? 0 : 1)) + 1);
    tally.set(key, entry);
  }
  return [...tally.values()]
    .sort((m, n) => n.elements - m.elements)
    .map(({ movers, ...move }) => {
      const first = [...movers]
        .slice(0, FIRST_NAMES)
        .map(
          ([node, count]) =>
            `${nameOf(node)}${count > 1 ? ' with what it holds' : ''}`,
        );
      return {
        type: 'move' as const,
        ...move,
        first,
        rects: [...movers.keys()].slice(0, FIRST_NAMES).map(({ rect }) => rect),
        text: `${move.elements === 1 ? '1 element' : `${move.elements} elements`} moved ${direction(move.dx, move.dy)}: ${first.join(', ')}${movers.size > first.length ? ', …' : ''}`,
      };
    });
};

/**
 * Elements that only changed size or line breaks, named where the change
 * starts. Height grows from the inside: a page that grows resizes every
 * ancestor of what grew, so only the innermost is named. Width is handed
 * down: a box that got narrower narrows what it holds, so only the outermost
 * is named, with how many came along.
 */
const resizeFacts = (
  pairs: Pair[],
  touched: Set<LayoutNode>,
  styles: Styles,
  covered: Set<Pair>,
  parentOf: (node: LayoutNode) => Pair | undefined,
  scope?: Scope,
): Fact[] => {
  const inside = (node: LayoutNode): boolean =>
    node.kids.some((kid) => touched.has(kid) || inside(kid));
  // those whose width changed and that a fact can name
  const wide = new Set(
    pairs.filter(
      ({ a, b, kinds }) =>
        a &&
        b &&
        !kinds.includes('moved') &&
        kinds.includes('resized') &&
        Math.abs(b.rect[2] - a.rect[2]) > EPS,
    ),
  );
  // up through everything that changed width, to the outermost a fact can name
  const top = (pair: Pair): Pair => {
    let best = pair;
    let parent = pair.b && parentOf(pair.b);
    while (
      parent?.a &&
      parent.b &&
      Math.abs(parent.b.rect[2] - parent.a.rect[2]) > EPS
    ) {
      if (wide.has(parent)) best = parent;
      parent = parentOf(parent.b);
    }
    return best;
  };
  const along = new Map<Pair, number>();
  for (const pair of wide) {
    const root = top(pair);
    if (root !== pair) along.set(root, (along.get(root) ?? 0) + 1);
  }
  const out: Fact[] = [];
  for (const pair of pairs) {
    const { a, b, kinds } = pair;
    if (!a || !b || kinds.includes('moved')) continue;
    const resized = kinds.includes('resized');
    const rewrapped = kinds.includes('rewrapped');
    if (!resized && !rewrapped) continue;
    const came = along.get(pair) ?? 0;
    if (wide.has(pair) ? top(pair) !== pair : inside(b)) continue;
    const before = { width: round(a.rect[2]), height: round(a.rect[3]) };
    const after = { width: round(b.rect[2]), height: round(b.rect[3]) };
    const element = nameOf(b);
    const changes = styles(pair);
    const parts = [
      ...(resized
        ? [
            `${element} resized ${before.width}x${before.height} → ${after.width}x${after.height}${came > 0 ? `, and ${came === 1 ? '1 element' : `${came} elements`} inside it with it` : ''}`,
          ]
        : []),
      ...(rewrapped
        ? [
            `${resized ? 'its text' : `text of ${element}`} ${
              b.lines?.length === a.lines?.length
                ? 'breaks at other places'
                : `wraps onto ${b.lines?.length ?? 0} ${b.lines?.length === 1 ? 'line' : 'lines'} (was ${a.lines?.length ?? 0})`
            }`,
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
      ...(changes.length > 0 && { styles: changes }),
      text: `${parts.join('; ')}${changes.length > 0 ? `: ${describeStyleChanges(changes)}` : ''}`,
      ...(scope && { outside: outsidePair(pair, scope) }),
    });
    covered.add(pair);
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
 * changed elements first, then elements whose spacing changed, then moves
 * (one per offset, however many elements), then elements that changed size,
 * then areas the layout cannot explain. Where the snapshots hold style values
 * a change is named by property ("border-radius 8px → 4px").
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
  faint,
  unseen,
}: FactsInput): Fact[] => {
  const counted = mask.includes(1);
  const differs = counted || !!faint?.includes(1);
  if (!differs && !unseen?.includes(1)) return [];
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
    // without a layout, pixels under what counts are not a change
    if (!counted) return [];
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
    faint,
    unseen,
    trustMovedText: true,
  });
  // the style changes of each element, with what it only inherited marked as such
  const pairOf = new Map<LayoutNode, Pair>();
  const parentOf = new Map<LayoutNode, LayoutNode>();
  for (const pair of diff.pairs) {
    if (!pair.b) continue;
    pairOf.set(pair.b, pair);
    for (const kid of pair.b.kids) parentOf.set(kid, pair.b);
  }
  const known = new Map<Pair, StyleChange[]>();
  const styles: Styles = (pair) => {
    let changes = known.get(pair);
    if (!changes) {
      const parent = pair.b && parentOf.get(pair.b);
      const parentPair = parent && pairOf.get(parent);
      changes = styleChanges(
        pair.a,
        pair.b,
        parent && parentPair
          ? { changes: styles(parentPair), name: nameOf(parent) }
          : undefined,
      );
      known.set(pair, changes);
    }
    return changes;
  };
  const scope = only && scopeOf(only, layout.actual, diff.pairs, styles);
  const covered = new Set<Pair>(checked.real);
  // an element that came or went takes what it holds along: one fact, not one each
  const whole = (kind: 'added' | 'removed') => {
    const side = kind === 'added' ? 'b' : 'a';
    const other = kind === 'added' ? 'a' : 'b';
    const real = new Map<LayoutNode, Pair>();
    for (const pair of checked.real) {
      const node = pair[side];
      if (node && pair.kinds.includes(kind)) real.set(node, pair);
    }
    const pairOn = new Map<LayoutNode, Pair>();
    for (const pair of diff.pairs) {
      const node = pair[side];
      if (node) pairOn.set(node, pair);
    }
    // there on this side only, whether it draws anything itself or not (a wrapper)
    const lone = (node: LayoutNode) => {
      const pair = pairOn.get(node);
      const twin = pair?.[other];
      return !!pair && !node.hidden && (!twin || !!twin.hidden);
    };
    const held = new Map<Pair, Pair[]>();
    const visit = (node: LayoutNode, root?: Pair) => {
      const pair = real.get(node);
      if (root && pair) held.set(root, [...(held.get(root) ?? []), pair]);
      const here = pair ?? (lone(node) ? pairOn.get(node) : undefined);
      node.kids.forEach((kid) => visit(kid, root ?? here));
    };
    visit(layout[kind === 'added' ? 'actual' : 'baseline'].root);
    const inside = new Map<Pair, number>();
    const skipped = new Set<Pair>();
    /** Wrappers that draw nothing themselves and went with several elements. */
    const wrappers: Pair[] = [];
    for (const [root, pairs] of held) {
      const drawn = checked.real.includes(root);
      if (!drawn && pairs.length < 2) continue;
      pairs.forEach((pair) => skipped.add(pair));
      if (drawn) {
        inside.set(root, pairs.length);
        continue;
      }
      const wrapper: Pair = { ...root, kinds: [kind] };
      inside.set(wrapper, pairs.length);
      wrappers.push(wrapper);
    }
    return { inside, skipped, wrappers };
  };
  const added = whole('added');
  const removed = whole('removed');
  out.push(
    ...[
      ...checked.real.filter(
        (pair) => !added.skipped.has(pair) && !removed.skipped.has(pair),
      ),
      ...added.wrappers,
      ...removed.wrappers,
    ].map((pair) => ({
      ...elementFact(
        pair,
        checked.real.includes(pair) ? styles(pair) : [],
        (added.inside.get(pair) ?? 0) + (removed.inside.get(pair) ?? 0),
      ),
      ...(checked.faint.includes(pair) && { faint: true }),
      ...(checked.unseen.includes(pair) && { unseen: true }),
      ...(scope && { outside: outsidePair(pair, scope) }),
    })),
  );
  // what a transformed element holds is drawn elsewhere and at another size:
  // that is the transform, named once on the element itself
  const warped = new Set<LayoutNode>();
  const warp = (node: LayoutNode) => {
    warped.add(node);
    node.kids.forEach(warp);
  };
  for (const pair of diff.pairs) {
    if (
      pair.b &&
      !warped.has(pair.b) &&
      own(styles(pair)).some(({ property }) => property === 'transform')
    ) {
      warp(pair.b);
    }
  }
  const layoutOnly = diff.layout.filter(
    (pair) => !has(pair, CHANGE) && !(pair.b && warped.has(pair.b)),
  );
  // what explains the new height of the box it is in: an element that itself
  // changed, not one that only moved (a taller box moves what it centres)
  const touched = new Set<LayoutNode>();
  for (const pair of diff.pairs) {
    if (
      pair.b &&
      (pair.kinds.some((kind) => kind !== 'moved') ||
        own(styles(pair)).length > 0)
    ) {
      touched.add(pair.b);
    }
  }
  const resizes = resizeFacts(
    layoutOnly,
    touched,
    styles,
    covered,
    (node) => {
      const parent = parentOf.get(node);
      return parent && pairOf.get(parent);
    },
    scope,
  );
  // a style that changed on an element nothing else names: its spacing (the
  // cause of moves around it), or one that shows on what it holds (an
  // alignment, an opacity, a transform)
  for (const pair of diff.pairs) {
    if (!pair.a || !pair.b || covered.has(pair) || pair.b.hidden) continue;
    const changes = own(styles(pair));
    if (changes.length === 0) continue;
    const element = nameOf(pair.b);
    out.push({
      type: 'style',
      element,
      rect: pair.b.rect,
      styles: changes,
      text: `${element}: ${describeStyleChanges(changes)}`,
      ...(scope && { outside: outsidePair(pair, scope) }),
    });
  }
  out.push(
    ...moveFacts(
      layoutOnly,
      (node) => {
        const parent = parentOf.get(node);
        return parent && pairOf.get(parent);
      },
      scope,
    ),
  );
  out.push(...resizes);
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
  // nothing counted: all of it is under what a test sees, or was not looked at
  if (!counted) {
    for (const fact of out) {
      if (fact.unseen) continue;
      if (differs) fact.faint = true;
      else fact.unseen = true;
    }
  }
  for (const fact of out) {
    if (fact.unseen) fact.text += UNSEEN;
    else if (fact.faint) fact.text += FAINT;
  }
  return out;
};
