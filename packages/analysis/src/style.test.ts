import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  decodeLayout,
  encodeLayout,
  facts,
  STYLE,
  styleChanges,
  styleOf,
  type Layout,
  type LayoutNode,
  type Rect,
  type StyleProperty,
} from './index';
import { image, maskOf, paint } from './test-utils';

const DEFAULTS: Record<StyleProperty, string> = {
  'font-family': 'Arial',
  'font-size': '16px',
  'font-weight': '400',
  'line-height': 'normal',
  color: 'rgb(0, 0, 0)',
  'background-color': 'rgba(0, 0, 0, 0)',
  'border-top-left-radius': '0px',
  'border-top-right-radius': '0px',
  'border-bottom-right-radius': '0px',
  'border-bottom-left-radius': '0px',
  'padding-top': '0px',
  'padding-right': '0px',
  'padding-bottom': '0px',
  'padding-left': '0px',
  'row-gap': 'normal',
  'column-gap': 'normal',
  'margin-top': '0px',
  'margin-right': '0px',
  'margin-bottom': '0px',
  'margin-left': '0px',
};

/** A stored style string: the defaults with some values replaced. */
const style = (values: Partial<Record<StyleProperty, string>> = {}) =>
  STYLE.map((property) => values[property] ?? DEFAULTS[property]).join('|');

const node = (
  tag: string,
  rect: Rect,
  extra: Partial<LayoutNode> = {},
): LayoutNode => ({ tag, rect, kids: [], style: style(), ...extra });

const radius = (value: string) => ({
  'border-top-left-radius': value,
  'border-top-right-radius': value,
  'border-bottom-right-radius': value,
  'border-bottom-left-radius': value,
});

describe('style values', () => {
  it('keeps the same list in the page as outside it', () => {
    const source = fs.readFileSync(
      path.join(__dirname, 'layout', 'snapshot.ts'),
      'utf8',
    );
    const list = /const STYLE = \[([^\]]+)\]/.exec(source)?.[1] ?? '';
    expect([...list.matchAll(/'([^']+)'/g)].map((match) => match[1])).toEqual([
      ...STYLE,
    ]);
  });

  it('survives encoding', () => {
    const layout: Layout = {
      size: { width: 100, height: 100 },
      scale: 1,
      count: 2,
      root: node('html', [0, 0, 100, 100], {
        kids: [
          node('p', [0, 0, 100, 20], { style: style({ color: 'red' }) }),
          { tag: 'i', rect: [0, 20, 10, 10], kids: [] },
        ],
      }),
    };
    const back = decodeLayout(encodeLayout(layout));
    expect(back).toEqual(layout);
    expect(styleOf((back as Layout).root.kids[0], 'color')).toBe('red');
    expect(styleOf((back as Layout).root.kids[1], 'color')).toBeUndefined();
  });

  it('names what changed, four alike sides or corners as one', () => {
    const before = node('button', [0, 0, 80, 40], {
      style: style({ ...radius('8px'), 'padding-top': '12px' }),
    });
    const after = node('button', [0, 0, 80, 44], {
      style: style({ ...radius('4px'), 'padding-top': '16px' }),
    });
    expect(styleChanges(before, after)).toEqual([
      { property: 'padding-top', before: '12px', after: '16px' },
      { property: 'border-radius', before: '8px', after: '4px' },
    ]);
  });

  it('has nothing to say without stored values on both sides', () => {
    const bare: LayoutNode = { tag: 'p', rect: [0, 0, 1, 1], kids: [] };
    expect(styleChanges(bare, node('p', [0, 0, 1, 1]))).toEqual([]);
    expect(styleChanges(node('p', [0, 0, 1, 1]), null)).toEqual([]);
  });

  it('marks an inherited change with where it came from', () => {
    const big = { 'font-size': '18px' };
    const changes = styleChanges(
      node('p', [0, 0, 1, 1]),
      node('p', [0, 0, 1, 1], { style: style({ ...big, color: 'red' }) }),
      {
        name: 'body',
        changes: [{ property: 'font-size', before: '16px', after: '18px' }],
      },
    );
    expect(changes).toEqual([
      { property: 'font-size', before: '16px', after: '18px', from: 'body' },
      { property: 'color', before: 'rgb(0, 0, 0)', after: 'red' },
    ]);
  });
});

describe('facts with style values', () => {
  const W = 200;
  const H = 300;
  const layout = (kids: LayoutNode[]): Layout => ({
    size: { width: W, height: H },
    scale: 1,
    count: kids.length + 1,
    root: node('html', [0, 0, W, H], { kids }),
  });
  const box = (
    cls: string,
    y: number,
    height: number,
    extra: Partial<LayoutNode> = {},
  ) =>
    node('div', [20, y, 100, height], { cls, box: true, paint: cls, ...extra });
  const draw = (
    boxes: [number, number, [number, number, number]][],
  ): ReturnType<typeof image> =>
    boxes.reduce(
      (picture, [y, height, color]) =>
        paint(picture, { x: 20, y, width: 100, height }, color),
      image(W, H),
    );
  const BLUE: [number, number, number] = [30, 90, 200];
  const RED: [number, number, number] = [200, 30, 30];
  const YELLOW: [number, number, number] = [240, 200, 0];

  it('names the style behind a changed look', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 50, RED]]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([
          box('card', 40, 50, {
            style: style({ 'background-color': 'rgb(30, 90, 200)' }),
          }),
        ]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'red',
            style: style({ 'background-color': 'rgb(200, 30, 30)' }),
          }),
        ]),
      },
    });
    expect(found).toHaveLength(1);
    expect(found[0].text).toBe(
      'div.card: background-color rgb(30, 90, 200) → rgb(200, 30, 30)',
    );
    expect(found[0]).toMatchObject({
      styles: [
        {
          property: 'background-color',
          before: 'rgb(30, 90, 200)',
          after: 'rgb(200, 30, 30)',
        },
      ],
    });
  });

  it('names the padding behind a resize', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 58, BLUE]]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([box('card', 40, 50)]),
        actual: layout([
          box('card', 40, 58, { style: style({ 'padding-bottom': '8px' }) }),
        ]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'div.card resized 100x50 → 100x58: padding-bottom 0px → 8px',
    ]);
  });

  it('names the margin of an element that only pushed others', () => {
    const baseline = draw([
      [10, 20, YELLOW],
      [40, 50, BLUE],
    ]);
    const actual = draw([
      [10, 20, YELLOW],
      [56, 50, BLUE],
    ]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([box('promo', 10, 20), box('card', 40, 50)]),
        actual: layout([
          box('promo', 10, 20, { style: style({ 'margin-bottom': '16px' }) }),
          box('card', 56, 50),
        ]),
      },
      only: [[20, 56, 100, 50]],
    });
    expect(found.map(({ text, outside }) => [text, outside])).toEqual([
      ['div.promo: margin-bottom 0px → 16px', true],
      ['1 element moved down by 16 px: div.card', true],
    ]);
  });

  it('counts a move as the doing of the named element when its own margin changed', () => {
    const baseline = draw([
      [10, 20, YELLOW],
      [40, 50, BLUE],
    ]);
    const actual = draw([
      [18, 20, YELLOW],
      [48, 50, BLUE],
    ]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([box('promo', 10, 20), box('card', 40, 50)]),
        actual: layout([
          box('promo', 18, 20, { style: style({ 'margin-top': '8px' }) }),
          box('card', 48, 50),
        ]),
      },
      only: [[20, 18, 100, 20]],
    });
    expect(found.map(({ text, outside }) => [text, outside])).toEqual([
      ['div.promo: margin-top 0px → 8px', false],
      ['2 elements moved down by 8 px: div.promo, div.card', false],
    ]);
  });
});
