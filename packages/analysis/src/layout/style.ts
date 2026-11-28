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
  'letter-spacing',
  'font-style',
  'text-align',
  'text-transform',
  'text-decoration-line',
  'opacity',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'box-shadow',
  'outline-style',
  'outline-width',
  'outline-color',
  'background-image',
  'transform',
  'filter',
  'outline-offset',
  'order',
] as const;

export type StyleProperty = (typeof STYLE)[number];

/** Styles a child takes from its parent unless it sets its own. */
const INHERITED: string[] = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'color',
  'letter-spacing',
  'font-style',
  'text-align',
  'text-transform',
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

const SIDES = ['top', 'right', 'bottom', 'left'];

/** Properties written as one when their parts end up alike: four sides, four corners, two gaps. */
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
  ...['width', 'style', 'color'].map((part): [string, string[]] => [
    `border-${part}`,
    SIDES.map((side) => `border-${side}-${part}`),
  ]),
];

/** One style of an element that has another value than before. */
export type StyleChange = {
  /** A property of `STYLE`, or a shorthand (`padding`, `margin`, `border-radius`, `gap`, `border-width`, `border-style`, `border-color`) when its parts changed to one value; `before` then lists the parts when they differed (`0px 0px 1px 0px`). */
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
  // the colour and style of a border or outline that is not drawn say nothing
  const both = (property: StyleProperty, value: string) => {
    const i = STYLE.indexOf(property);
    return before[i] === value && after[i] === value;
  };
  for (const side of SIDES) {
    if (both(`border-${side}-width` as StyleProperty, '0px')) {
      changed.delete(`border-${side}-color`);
      changed.delete(`border-${side}-style`);
    }
  }
  if (both('outline-style', 'none')) {
    changed.delete('outline-color');
    changed.delete('outline-width');
    changed.delete('outline-offset');
  }
  for (const [shorthand, parts] of SHORTHANDS) {
    // several parts changed and all of them are now alike: one line says it
    if (parts.filter((part) => changed.has(part)).length < 2) continue;
    const at = parts.map((part) => STYLE.indexOf(part as StyleProperty));
    const [now] = at.map((i) => after[i]);
    if (at.some((i) => after[i] !== now)) continue;
    const was = at.map((i) => before[i]);
    parts.forEach((part) => changed.delete(part));
    changed.set(shorthand, {
      property: shorthand,
      before: was.every((value) => value === was[0]) ? was[0] : was.join(' '),
      after: now,
    });
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

/**
 * How far an element paints beyond its own box, in CSS pixels: its shadows
 * (offset, blur and spread) and its outline. 0 when the snapshot has no styles.
 */
export const overflowOf = (node: LayoutNode): number => {
  let reach = 0;
  const shadow = styleOf(node, 'box-shadow');
  if (shadow && shadow !== 'none') {
    // colours hold commas of their own
    for (const one of shadow.replace(/[a-z-]+\([^)]*\)/g, '').split(',')) {
      if (one.includes('inset')) continue;
      const [x = 0, y = 0, blur = 0, spread = 0] = (
        one.match(/-?[\d.]+px/g) ?? []
      ).map(Number.parseFloat);
      reach = Math.max(
        reach,
        Math.max(Math.abs(x), Math.abs(y)) + blur + spread,
      );
    }
  }
  if ((styleOf(node, 'outline-style') ?? 'none') !== 'none') {
    reach = Math.max(
      reach,
      (Number.parseFloat(styleOf(node, 'outline-width') ?? '0') || 0) +
        Math.max(
          0,
          Number.parseFloat(styleOf(node, 'outline-offset') ?? '0') || 0,
        ),
    );
  }
  return reach;
};

/** Whether the element's own box lets what is behind it show: no background of its own. */
export const seeThrough = (node: LayoutNode): boolean =>
  !node.media &&
  styleOf(node, 'background-color') === 'rgba(0, 0, 0, 0)' &&
  styleOf(node, 'background-image') === 'none';

/** The largest corner radius of the element in CSS pixels; 0 when square or unknown. */
export const cornerOf = (node: LayoutNode): number =>
  Math.max(
    0,
    ...(
      [
        'border-top-left-radius',
        'border-top-right-radius',
        'border-bottom-right-radius',
        'border-bottom-left-radius',
      ] as const
    ).map((corner) => {
      const value = styleOf(node, corner) ?? '';
      const size = Number.parseFloat(value) || 0;
      const most = Math.min(node.rect[2], node.rect[3]) / 2;
      return Math.min(
        most,
        value.includes('%') ? (most * 2 * size) / 100 : size,
      );
    }),
  );

/**
 * A computed transform in words: `matrix(0.99863, -0.052336, 0.052336, 0.99863, 0, 0)`
 * is `rotate(-3deg)`. Empty when it is not a plain 2D matrix or does nothing.
 */
export const transformInWords = (value: string): string => {
  const numbers = /^matrix\(([^)]+)\)$/.exec(value)?.[1].split(',').map(Number);
  if (numbers?.length !== 6 || numbers.some(Number.isNaN)) return '';
  const [a, b, c, d, x, y] = numbers;
  const tidy = (n: number) => Number(n.toFixed(2));
  const angle = tidy((Math.atan2(b, a) * 180) / Math.PI);
  const sx = tidy(Math.hypot(a, b));
  const sy = tidy(Math.hypot(c, d));
  return [
    ...(x !== 0 || y !== 0 ? [`translate(${tidy(x)}px, ${tidy(y)}px)`] : []),
    ...(angle !== 0 ? [`rotate(${angle}deg)`] : []),
    ...(sx !== 1 || sy !== 1
      ? [sx === sy ? `scale(${sx})` : `scale(${sx}, ${sy})`]
      : []),
  ].join(' ');
};

const shown = (property: string, value: string) => {
  const words = property === 'transform' ? transformInWords(value) : '';
  return words ? `${value} (${words})` : value;
};

/** `border-radius 8px → 4px, color rgb(0, 0, 0) → rgb(200, 0, 0) (from body)`. */
export const describeStyleChanges = (changes: StyleChange[]): string =>
  changes
    .map(
      ({ property, before, after, from }) =>
        `${property} ${shown(property, before)} → ${shown(property, after)}${from ? ` (from ${from})` : ''}`,
    )
    .join(', ');
