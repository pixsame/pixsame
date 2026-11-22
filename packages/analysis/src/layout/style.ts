import type { LayoutNode } from './types';

/**
 * The computed styles a snapshot keeps as values, in the order they are
 * stored in `LayoutNode.style`. Everything else that changes how an element
 * looks is only in the `paint` hash, which says that it changed, not what.
 *
 * `snapshotLayout` runs in the page and cannot import this, so it has its own
 * copy; a test keeps the two the same.
 */
export const STYLE = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'background-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'row-gap',
  'column-gap',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
] as const;

export type StyleProperty = (typeof STYLE)[number];

/** Styles a child takes from its parent unless it sets its own. */
const INHERITED: string[] = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
];

/** Styles whose change moves or resizes things without changing how the element itself is painted. */
export const SPACING: string[] = [
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'row-gap',
  'column-gap',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
];

/** Properties written as one when all their parts changed alike: four sides, four corners, two gaps. */
const SHORTHANDS: [string, string[]][] = [
  [
    'border-radius',
    [
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
    ],
  ],
  [
    'padding',
    ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'],
  ],
  ['margin', ['margin-top', 'margin-right', 'margin-bottom', 'margin-left']],
  ['gap', ['row-gap', 'column-gap']],
];

/** One style of an element that has another value than before. */
export type StyleChange = {
  /** A property of `STYLE`, or a shorthand (`padding`, `margin`, `border-radius`, `gap`) when all its parts changed alike. */
  property: string;
  before: string;
  after: string;
  /** Set when the element only took the change over from an ancestor: that ancestor's name. */
  from?: string;
};

const valuesOf = (node: LayoutNode): string[] | undefined => {
  const values = node.style?.split('|');
  return values?.length === STYLE.length ? values : undefined;
};

/** The stored value of one style of an element; `undefined` when the snapshot has none. */
export const styleOf = (
  node: LayoutNode,
  property: StyleProperty,
): string | undefined => valuesOf(node)?.[STYLE.indexOf(property)];

/**
 * Which stored styles differ between an element before and after, shorthands
 * folded. `parent` is the same for the element's parent: an inherited style
 * that changed there in the same way is marked as coming `from` it. Empty
 * when either side has no stored styles.
 */
export const styleChanges = (
  a: LayoutNode | null,
  b: LayoutNode | null,
  parent?: { changes: StyleChange[]; name: string },
): StyleChange[] => {
  const before = a && valuesOf(a);
  const after = b && valuesOf(b);
  if (!before || !after) return [];
  const changed = new Map<string, StyleChange>();
  STYLE.forEach((property, i) => {
    if (before[i] !== after[i]) {
      changed.set(property, { property, before: before[i], after: after[i] });
    }
  });
  for (const [shorthand, parts] of SHORTHANDS) {
    const all = parts.map((part) => changed.get(part));
    const [first] = all;
    if (
      first &&
      all.every(
        (one) => one?.before === first.before && one.after === first.after,
      )
    ) {
      parts.forEach((part) => changed.delete(part));
      changed.set(shorthand, { ...first, property: shorthand });
    }
  }
  return [...changed.values()].map((change) => {
    if (!INHERITED.includes(change.property)) return change;
    const same = parent?.changes.find(
      (one) =>
        one.property === change.property &&
        one.before === change.before &&
        one.after === change.after,
    );
    return same ? { ...change, from: same.from ?? parent?.name } : change;
  });
};

/** `border-radius 8px → 4px, color rgb(0, 0, 0) → rgb(200, 0, 0) (from body)`. */
export const describeStyleChanges = (changes: StyleChange[]): string =>
  changes
    .map(
      ({ property, before, after, from }) =>
        `${property} ${before} → ${after}${from ? ` (from ${from})` : ''}`,
    )
    .join(', ');
