import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  analysisPlugin,
  captureComparison,
  decodeLayout,
  encodeLayout,
  factLines,
  facts,
  overflowOf,
  STYLE,
  transformInWords,
  styleChanges,
  styleOf,
  withAnalysis,
  type Analysis,
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
  'letter-spacing': 'normal',
  'font-style': 'normal',
  'text-align': 'start',
  'text-transform': 'none',
  'text-decoration-line': 'none',
  opacity: '1',
  'border-top-width': '0px',
  'border-right-width': '0px',
  'border-bottom-width': '0px',
  'border-left-width': '0px',
  'border-top-style': 'none',
  'border-right-style': 'none',
  'border-bottom-style': 'none',
  'border-left-style': 'none',
  'border-top-color': 'rgb(0, 0, 0)',
  'border-right-color': 'rgb(0, 0, 0)',
  'border-bottom-color': 'rgb(0, 0, 0)',
  'border-left-color': 'rgb(0, 0, 0)',
  'box-shadow': 'none',
  'outline-style': 'none',
  'outline-width': '3px',
  'outline-color': 'rgb(0, 0, 0)',
  'background-image': 'none',
  transform: 'none',
  filter: 'none',
  'outline-offset': '0px',
  order: '0',
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

  it('leaves out the colour of a border and an outline that are not drawn', () => {
    const p = (values: Partial<Record<StyleProperty, string>>) =>
      node('p', [0, 0, 1, 1], { style: style(values) });
    const red = {
      color: 'red',
      'border-top-color': 'red',
      'border-right-color': 'red',
      'border-bottom-color': 'red',
      'border-left-color': 'red',
      'outline-color': 'red',
    };
    expect(styleChanges(p({}), p(red))).toEqual([
      { property: 'color', before: 'rgb(0, 0, 0)', after: 'red' },
    ]);
    // drawn on one side: that side's colour is a change
    const drawn = {
      'border-bottom-width': '1px',
      'border-bottom-style': 'solid',
    };
    expect(
      styleChanges(p(drawn), p({ ...drawn, ...red })).map(
        ({ property }) => property,
      ),
    ).toEqual(['color', 'border-bottom-color']);
  });

  it('writes sides that end up alike as one property, with what each was', () => {
    const before = node('th', [0, 0, 1, 1], {
      style: style({
        'border-bottom-width': '1px',
        'border-bottom-style': 'solid',
      }),
    });
    const all = (part: string, value: string) =>
      Object.fromEntries(
        ['top', 'right', 'bottom', 'left'].map((side) => [
          `border-${side}-${part}`,
          value,
        ]),
      );
    const after = node('th', [0, 0, 1, 1], {
      style: style({ ...all('width', '3px'), ...all('style', 'solid') }),
    });
    expect(styleChanges(before, after)).toEqual([
      { property: 'border-width', before: '0px 0px 1px 0px', after: '3px' },
      {
        property: 'border-style',
        before: 'none none solid none',
        after: 'solid',
      },
    ]);
  });

  it('knows how far a shadow and an outline reach past the box', () => {
    const reach = (values: Partial<Record<StyleProperty, string>>) =>
      overflowOf(node('a', [0, 0, 1, 1], { style: style(values) }));
    expect(reach({})).toBe(0);
    expect(
      reach({ 'box-shadow': 'rgba(0, 0, 0, 0.35) 0px 6px 16px 0px' }),
    ).toBe(22);
    expect(
      reach({
        'box-shadow':
          'rgb(0, 0, 0) 0px 0px 0px 2px, rgba(0, 0, 0, 0.2) 4px -8px 10px 1px, rgb(0, 0, 0) 0px 0px 90px 0px inset',
      }),
    ).toBe(19);
    expect(reach({ 'outline-style': 'solid', 'outline-width': '3px' })).toBe(3);
    expect(
      reach({
        'outline-style': 'solid',
        'outline-width': '3px',
        'outline-offset': '2px',
      }),
    ).toBe(5);
    expect(overflowOf({ tag: 'a', rect: [0, 0, 1, 1], kids: [] })).toBe(0);
  });

  it('says a transform in words', () => {
    expect(
      transformInWords('matrix(0.99863, -0.052336, 0.052336, 0.99863, 0, 0)'),
    ).toBe('rotate(-3deg)');
    expect(transformInWords('matrix(1.1, 0, 0, 1.1, 10, -4)')).toBe(
      'translate(10px, -4px) scale(1.1)',
    );
    expect(transformInWords('matrix(1, 0, 0, 1, 0, 0)')).toBe('');
    expect(transformInWords('none')).toBe('');
    expect(
      transformInWords(
        'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)',
      ),
    ).toBe('');
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

  it('reports a change too faint to count only when told which pixels differ at all', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 50, [30, 90, 201]]]);
    const input = {
      baseline,
      actual,
      // nothing differs by enough to count
      mask: new Uint8Array(W * H),
      layout: {
        baseline: layout([
          box('card', 40, 50, {
            style: style({ 'background-color': 'rgb(30, 90, 200)' }),
          }),
        ]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'other',
            style: style({ 'background-color': 'rgb(30, 90, 201)' }),
          }),
        ]),
      },
    };
    expect(facts(input)).toEqual([]);
    const found = facts({ ...input, faint: maskOf(baseline, actual) });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ type: 'element', faint: true });
    expect(found[0].text).toBe(
      'div.card: background-color rgb(30, 90, 200) → rgb(30, 90, 201) (faint: the pixels differ by less than a test counts)',
    );
    // without a layout faint pixels are not a change
    expect(
      facts({
        baseline,
        actual,
        mask: input.mask,
        faint: maskOf(baseline, actual),
      }),
    ).toEqual([]);
  });

  it('does not doubt text that stayed on a background that changed', () => {
    // the letters blend with what is behind them, so their pixels change too
    const text = (
      picture: ReturnType<typeof image>,
      ink: [number, number, number],
    ) => paint(picture, { x: 30, y: 50, width: 60, height: 10 }, ink);
    const baseline = text(draw([[40, 50, BLUE]]), [10, 10, 10]);
    const actual = text(draw([[40, 50, YELLOW]]), [20, 20, 5]);
    const label = () =>
      node('p', [30, 50, 60, 10], { text: 'Hello', lines: [[30, 50, 60, 10]] });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([
          box('card', 40, 50, {
            kids: [label()],
            style: style({ 'background-color': 'rgb(30, 90, 200)' }),
          }),
        ]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'yellow',
            kids: [label()],
            style: style({ 'background-color': 'rgb(240, 200, 0)' }),
          }),
        ]),
      },
    });
    expect(found.map(({ type }) => type)).toEqual(['element']);
  });

  it('takes the pixels of a new shadow as part of the element that got it', () => {
    const baseline = draw([[40, 50, BLUE]]);
    // the shadow: a grey band under the box
    const actual = paint(
      draw([[40, 50, BLUE]]),
      { x: 20, y: 90, width: 100, height: 12 },
      [200, 200, 200],
    );
    paint(actual, { x: 20, y: 40, width: 100, height: 50 }, BLUE);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([box('card', 40, 50)]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'shadow',
            style: style({
              'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 6px 6px 0px',
            }),
          }),
        ]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'div.card: box-shadow none → rgba(0, 0, 0, 0.2) 0px 6px 6px 0px',
    ]);
  });

  it('counts what an element holds as changed when its opacity changed', () => {
    const inner = (color: [number, number, number]) =>
      paint(
        draw([[40, 50, BLUE]]),
        { x: 30, y: 50, width: 40, height: 20 },
        color,
      );
    const baseline = inner(RED);
    const actual = inner([220, 120, 120]);
    const kid = () =>
      node('span', [30, 50, 40, 20], { cls: 'tag', box: true, paint: 'tag' });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([box('card', 40, 50, { kids: [kid()] })]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'faded',
            kids: [kid()],
            style: style({ opacity: '0.55' }),
          }),
        ]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'div.card: opacity 1 → 0.55',
    ]);
  });

  it('names a style that shows only on what the element holds', () => {
    // a wrapper that draws nothing: its opacity fades the box inside it
    const inner = (color: [number, number, number]) => draw([[40, 50, color]]);
    const baseline = inner(BLUE);
    const actual = inner([140, 170, 230]);
    const wrap = (extra: Partial<LayoutNode>) =>
      node('section', [20, 40, 100, 50], {
        id: 'group',
        kids: [box('card', 40, 50)],
        ...extra,
      });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([wrap({})]),
        actual: layout([wrap({ style: style({ opacity: '0.5' }) })]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'section#group: opacity 1 → 0.5',
    ]);
  });

  it('does not doubt a box without a background on a background that changed', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 50, YELLOW]]);
    const frame = () =>
      node('div', [30, 50, 60, 20], {
        cls: 'lined',
        box: true,
        paint: 'lined',
      });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([
          box('card', 40, 50, {
            kids: [frame()],
            style: style({ 'background-color': 'rgb(30, 90, 200)' }),
          }),
        ]),
        actual: layout([
          box('card', 40, 50, {
            paint: 'yellow',
            kids: [frame()],
            style: style({ 'background-color': 'rgb(240, 200, 0)' }),
          }),
        ]),
      },
    });
    expect(found.map(({ type }) => type)).toEqual(['element']);
  });

  it('names the element that moved, not each thing in it', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[70, 50, BLUE]]);
    const row = (y: number) =>
      node('div', [20, y, 100, 50], {
        id: 'row',
        kids: [
          box('card', y, 50),
          node('span', [30, y + 10, 40, 10], {
            text: 'Label',
            lines: [[30, y + 10, 40, 10]],
          }),
        ],
      });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([row(40)]), actual: layout([row(70)]) },
    });
    expect(found.map(({ text }) => text)).toEqual([
      '2 elements moved down by 30 px: div#row with what it holds',
    ]);
  });

  it('names a narrower box once, with how many came along', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = paint(
      image(W, H),
      { x: 20, y: 40, width: 80, height: 50 },
      BLUE,
    );
    const card = (width: number) =>
      node('div', [20, 40, width, 50], {
        cls: 'card',
        box: true,
        paint: 'card',
        kids: [
          node('p', [20, 40, width, 20], {
            text: 'One',
            lines: [[20, 40, 30, 20]],
          }),
          node('p', [20, 60, width, 20], {
            text: 'Two',
            lines: [[20, 60, 30, 20]],
          }),
        ],
      });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([card(100)]), actual: layout([card(80)]) },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'div.card resized 100x50 → 80x50, and 2 elements inside it with it',
    ]);
  });

  it('folds what went with a removed element into one fact', () => {
    const baseline = paint(
      draw([[40, 50, BLUE]]),
      { x: 30, y: 50, width: 40, height: 20 },
      RED,
    );
    const actual = image(W, H);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([
          box('card', 40, 50, {
            kids: [
              node('span', [30, 50, 40, 20], {
                cls: 'tag',
                box: true,
                paint: 'tag',
              }),
            ],
          }),
        ]),
        actual: layout([]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'removed div.card with the element inside it',
    ]);
  });

  it('names a box that only got taller, whatever moved inside it', () => {
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 70, BLUE]]);
    // the label is centred, so it moves down by half of what the box grew
    const card = (height: number) =>
      box('card', 40, height, {
        kids: [
          node('span', [30, 40 + height / 2 - 5, 40, 10], {
            text: 'Label',
            lines: [[30, 40 + height / 2 - 5, 40, 10]],
          }),
        ],
      });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([card(50)]), actual: layout([card(70)]) },
    });
    expect(found.map(({ text }) => text)).toEqual([
      '1 element moved down by 10 px: span "Label"',
      'div.card resized 100x50 → 100x70',
    ]);
  });

  it('reports what the layout names where the pixels were left out', () => {
    const image1 = draw([[40, 50, BLUE]]);
    const card = (extra: Partial<LayoutNode>) => box('card', 40, 50, extra);
    const input = {
      baseline: image1,
      actual: image1,
      // the card flickers: its pixels are in no mask
      mask: new Uint8Array(W * H),
      faint: new Uint8Array(W * H),
      layout: {
        baseline: layout([card({})]),
        actual: layout([
          card({
            paint: 'tilted',
            style: style({
              transform: 'matrix(0.99863, -0.052336, 0.052336, 0.99863, 0, 0)',
            }),
          }),
        ]),
      },
    };
    expect(facts(input)).toEqual([]);
    const unseen = maskOf(image1, image(W, H));
    const found = facts({ ...input, unseen });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ unseen: true });
    expect(found[0].text).toBe(
      "div.card: transform none → matrix(0.99863, -0.052336, 0.052336, 0.99863, 0, 0) (rotate(-3deg)) (from the page's layout alone: the pixels there change by themselves)",
    );
    // nothing the layout names: what was left out stays left out
    expect(
      facts({
        ...input,
        unseen,
        layout: { baseline: layout([card({})]), actual: layout([card({})]) },
      }),
    ).toEqual([]);
  });

  describe('the facts of a failed comparison', () => {
    type Extra = Record<string, Record<string, unknown>>;
    type Decided = { status: string; message: string };
    const hooksOf = () => {
      const hooks: Record<string, unknown> = {};
      analysisPlugin().setup({
        on: (event: string, fn: unknown) => {
          hooks[event] = fn;
        },
      });
      return hooks as {
        afterCompare: (
          ctx: { input: { extra?: Extra } },
          measurement: Record<string, unknown>,
        ) => void;
        decide: (ctx: unknown, decision: Decided) => Decided;
      };
    };
    const baseline = draw([[40, 50, BLUE]]);
    const actual = draw([[40, 50, YELLOW]]);
    const diff = paint(
      image(W, H, [240, 240, 240]),
      { x: 20, y: 40, width: 100, height: 50 },
      [255, 0, 0],
    );
    const measurement = {
      kind: 'compared',
      baselineSize: { width: W, height: H },
      actualSize: { width: W, height: H },
      result: { diffPixels: 5000 },
    };
    const layouts = {
      baseline: layout([
        box('card', 40, 50, {
          style: style({ 'background-color': 'rgb(30, 90, 200)' }),
        }),
      ]),
      actual: layout([
        box('card', 40, 50, {
          paint: 'yellow',
          style: style({ 'background-color': 'rgb(240, 200, 0)' }),
        }),
      ]),
    };

    it('keeps them with the entry and prints them under the message', async () => {
      const { afterCompare, decide } = hooksOf();
      const ctx: { input: { extra?: Extra } } = { input: {} };
      await withAnalysis(
        async () => {
          captureComparison(baseline, actual, diff);
          afterCompare(ctx, measurement);
          const { message } = decide(
            {},
            { status: 'failed', message: '5000 pixels differ.' },
          );
          expect(message.split('\n').slice(1)).toEqual([
            'What changed:',
            '  - div.card: background-color rgb(30, 90, 200) → rgb(240, 200, 0)',
          ]);
          expect(message.startsWith('5000 pixels differ. ')).toBe(true);
        },
        { layout: layouts },
      );
      const analysis = ctx.input.extra?.pixsame.analysis as Analysis;
      expect(analysis.facts).toMatchObject([
        { type: 'element', element: 'div.card' },
      ]);
    });

    it('leaves them out without a layout on both sides', async () => {
      const { afterCompare, decide } = hooksOf();
      const ctx: { input: { extra?: Extra } } = { input: {} };
      await withAnalysis(async () => {
        captureComparison(baseline, actual, diff);
        afterCompare(ctx, measurement);
        expect(
          decide({}, { status: 'failed', message: '5000 pixels differ.' })
            .message,
        ).not.toContain('What changed');
      });
      expect(
        (ctx.input.extra?.pixsame.analysis as Analysis).facts,
      ).toBeUndefined();
    });

    it('prints ten lines and counts the rest', () => {
      const fact = (i: number) =>
        ({ type: 'pixels', label: 'x', text: `change ${i}` }) as const;
      const lines = factLines({
        facts: Array.from({ length: 20 }, (_, i) => fact(i)),
        factsOmitted: 5,
      }).split('\n');
      expect(lines).toHaveLength(12);
      expect(lines[11]).toBe('  - and 15 more');
      expect(factLines({})).toBe('');
    });
  });
});
