import { describe, expect, it } from 'vitest';
import {
  analyze,
  diffLayouts,
  type Layout,
  type LayoutNode,
  type Rect,
} from './index';
import { clone, image, maskOf, paint } from './test-utils';

const W = 200;
const H = 300;
const CARD: [number, number, number] = [30, 90, 200];

const node = (
  tag: string,
  rect: Rect,
  extra: Partial<LayoutNode> = {},
): LayoutNode => ({ tag, rect, kids: [], ...extra });

const layout = (kids: LayoutNode[], scale = 1): Layout => ({
  size: { width: W, height: H },
  scale,
  count: kids.length + 1,
  root: node('html', [0, 0, W, H], { kids }),
});

const card = (y: number, extra: Partial<LayoutNode> = {}) =>
  node('div', [20, y, 100, 50], {
    cls: 'card',
    box: true,
    paint: 'card',
    ...extra,
  });

const run = (
  baseline: ReturnType<typeof image>,
  actual: ReturnType<typeof image>,
  before: Layout,
  after: Layout,
) =>
  analyze({
    baseline,
    actual,
    mask: maskOf(baseline, actual),
    layout: { baseline: before, actual: after },
  });

describe('analyze with a layout snapshot', () => {
  it('says elements moved when the layout and the pixels agree', () => {
    const before = paint(
      image(W, H),
      { x: 20, y: 40, width: 100, height: 50 },
      CARD,
    );
    const after = paint(
      image(W, H),
      { x: 20, y: 52, width: 100, height: 50 },
      CARD,
    );
    const result = run(before, after, layout([card(40)]), layout([card(52)]));
    expect(result.label).toBe('moved');
    expect(result.description).toBe('One element moved down by 12 px.');
    expect(result.layout?.moves).toEqual([{ dx: 0, dy: 12, elements: 1 }]);
    expect(result.bundleKey).toBe('moved:0,12');
  });

  it('names what changed when an element was added and the rest moved', () => {
    const before = paint(
      image(W, H),
      { x: 20, y: 40, width: 100, height: 50 },
      CARD,
    );
    const after = paint(
      paint(
        image(W, H),
        { x: 20, y: 20, width: 160, height: 20 },
        [250, 200, 0],
      ),
      { x: 20, y: 60, width: 100, height: 50 },
      CARD,
    );
    const banner = node('div', [20, 20, 160, 20], {
      cls: 'banner',
      box: true,
      paint: 'banner',
    });
    const result = run(
      before,
      after,
      layout([card(40)]),
      layout([banner, card(60)]),
    );
    expect(result.label).toBe('moved-and-changed');
    expect(result.layout?.causes).toEqual(['added div.banner']);
    expect(result.description).toBe(
      'One element moved down by 20 px. Changed: added div.banner.',
    );
  });

  it('leaves a change that moved nothing to the pixel analysis', () => {
    const before = paint(
      image(W, H),
      { x: 20, y: 40, width: 100, height: 50 },
      CARD,
    );
    const after = paint(
      clone(before),
      { x: 30, y: 50, width: 30, height: 10 },
      [255, 0, 0],
    );
    const result = run(
      before,
      after,
      layout([card(40, { text: 'Price 12.99', lines: [[30, 50, 30, 10]] })]),
      layout([card(40, { text: 'Price 24.99', lines: [[30, 50, 30, 10]] })]),
    );
    expect(result.label).toBe('content-change');
    expect(result.layout?.causes).toEqual(['text div.card "Price 24.99"']);
  });

  it('does not say "moved" when pixels the layout cannot see also changed', () => {
    // the card moved, and a canvas (nothing changes in the DOM) was redrawn
    const canvas = (): LayoutNode =>
      node('canvas', [20, 200, 100, 50], {
        box: true,
        media: true,
        scales: true,
        paint: 'c',
      });
    const before = paint(
      paint(image(W, H), { x: 20, y: 40, width: 100, height: 50 }, CARD),
      { x: 20, y: 200, width: 100, height: 50 },
      [10, 10, 10],
    );
    const after = paint(
      paint(image(W, H), { x: 20, y: 52, width: 100, height: 50 }, CARD),
      { x: 20, y: 200, width: 100, height: 50 },
      [200, 10, 10],
    );
    const result = run(
      before,
      after,
      layout([card(40), canvas()]),
      layout([card(52), canvas()]),
    );
    expect(result.label).toBe('moved-and-changed');
    expect(result.layout?.unexplained.length).toBeGreaterThan(0);
  });

  it('works at device scale 2', () => {
    const scale = 2;
    const wide = (y: number) =>
      paint(
        image(W * scale, H * scale),
        { x: 40, y: y * scale, width: 200, height: 100 },
        CARD,
      );
    const result = run(
      wide(40),
      wide(52),
      layout([card(40)], scale),
      layout([card(52)], scale),
    );
    expect(result.label).toBe('moved');
    expect(result.layout?.moves).toEqual([{ dx: 0, dy: 12, elements: 1 }]);
  });

  it('ignores a DOM change with no pixels behind it', () => {
    const before = paint(
      image(W, H),
      { x: 20, y: 40, width: 100, height: 50 },
      CARD,
    );
    const after = paint(
      image(W, H),
      { x: 20, y: 52, width: 100, height: 50 },
      CARD,
    );
    const ghost = node('div', [150, 250, 20, 20], {
      box: true,
      paint: 'ghost',
    });
    const result = run(
      before,
      after,
      layout([card(40)]),
      layout([card(52), ghost]),
    );
    expect(result.label).toBe('moved');
  });
});

describe('analyze with a layout snapshot, no moves', () => {
  it('leaves a page that only grew to the size analysis', () => {
    // the page got 100 px taller: a filler was added and the body was resized
    const grey: [number, number, number] = [220, 220, 220];
    const baseline = paint(
      image(W, H + 100),
      { x: 20, y: 40, width: 100, height: 50 },
      CARD,
    );
    const actual = paint(
      clone(baseline),
      { x: 0, y: H, width: W, height: 100 },
      grey,
    );
    const body = (height: number, kids: LayoutNode[]) =>
      node('body', [0, 0, W, height], { box: true, paint: 'b', kids });
    const filler = node('div', [0, H, W, 100], {
      cls: 'filler',
      box: true,
      paint: 'f',
    });
    const grown = {
      ...layout([body(H + 100, [card(40), filler])]),
      size: { width: W, height: H + 100 },
    };
    const result = analyze({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      sizes: {
        baseline: { width: W, height: H },
        actual: { width: W, height: H + 100 },
      },
      layout: { baseline: layout([body(H, [card(40)])]), actual: grown },
    });
    expect(result.label).toBe('size-change');
    expect(result.layout?.moves).toEqual([]);
  });
});

describe('diffLayouts', () => {
  it('matches a reordered list by content and a rebuilt page by structure', () => {
    const item = (text: string, y: number) =>
      node('li', [0, y, 100, 20], {
        text,
        lines: [[0, y, 50, 20]],
        paint: 'x',
      });
    const before = layout([item('a', 0), item('b', 20), item('c', 40)]);
    const after = layout([item('c', 0), item('a', 20), item('b', 40)]);
    const diff = diffLayouts(before, after);
    expect(diff.changed).toEqual([]);
    expect(diff.layout).toHaveLength(3);
  });

  it('sees renamed ids and extra classes as nothing', () => {
    const el = (id: string, cls: string) =>
      node('p', [0, 0, 100, 20], {
        id,
        cls,
        text: 'same',
        lines: [[0, 0, 40, 20]],
        paint: 'x',
      });
    const diff = diffLayouts(layout([el('a', 'x')]), layout([el('b', 'y z')]));
    expect(diff.changed).toEqual([]);
    expect(diff.layout).toEqual([]);
  });
});
