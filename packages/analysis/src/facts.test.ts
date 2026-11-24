import { describe, expect, it } from 'vitest';
import { facts, type Layout, type LayoutNode, type Rect } from './index';
import { clone, image, maskOf, paint } from './test-utils';

const W = 200;
const H = 300;
const CARD: [number, number, number] = [30, 90, 200];

const node = (
  tag: string,
  rect: Rect,
  extra: Partial<LayoutNode> = {},
): LayoutNode => ({ tag, rect, kids: [], ...extra });

const layout = (kids: LayoutNode[]): Layout => ({
  size: { width: W, height: H },
  scale: 1,
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

const cardAt = (y: number, color = CARD) =>
  paint(image(W, H), { x: 20, y, width: 100, height: 50 }, color);

describe('facts', () => {
  it('is empty when no pixel differs', () => {
    const same = cardAt(40);
    expect(
      facts({ baseline: same, actual: clone(same), mask: maskOf(same, same) }),
    ).toEqual([]);
  });

  it('gives one fact for elements that moved by the same offset', () => {
    const baseline = cardAt(40);
    const actual = cardAt(52);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([card(40)]), actual: layout([card(52)]) },
    });
    expect(found).toEqual([
      {
        type: 'move',
        dx: 0,
        dy: 12,
        elements: 1,
        first: ['div.card'],
        rects: [card(52).rect],
        text: '1 element moved down by 12 px: div.card',
      },
    ]);
  });

  it('names the element whose look changed', () => {
    const baseline = cardAt(40);
    const actual = cardAt(40, [200, 30, 30]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([card(40)]),
        actual: layout([card(40, { paint: 'red' })]),
      },
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      type: 'element',
      kinds: ['look'],
      element: 'div.card',
      text: 'look changed on div.card',
    });
  });

  it('adds the new size when a changed element also changed size', () => {
    const baseline = cardAt(40);
    const actual = paint(
      image(W, H),
      { x: 20, y: 40, width: 120, height: 50 },
      [200, 30, 30],
    );
    const wider = node('div', [20, 40, 120, 50], {
      cls: 'card',
      box: true,
      paint: 'red',
    });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([card(40)]), actual: layout([wider]) },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'look changed on div.card; resized 100x50 → 120x50',
    ]);
  });

  it('names an added element and the move it caused', () => {
    const baseline = cardAt(40);
    const actual = paint(
      cardAt(70),
      { x: 20, y: 10, width: 100, height: 20 },
      [240, 200, 0],
    );
    const promo = node('div', [20, 10, 100, 20], {
      cls: 'promo',
      box: true,
      paint: 'promo',
    });
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: {
        baseline: layout([card(40)]),
        actual: layout([promo, card(70)]),
      },
    });
    expect(found.map(({ text }) => text)).toEqual([
      'added div.promo',
      '1 element moved down by 30 px: div.card',
    ]);
  });

  it('reports pixels the layout cannot explain as an area', () => {
    const baseline = cardAt(40);
    const actual = paint(
      clone(baseline),
      { x: 150, y: 200, width: 20, height: 20 },
      [0, 0, 0],
    );
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      layout: { baseline: layout([card(40)]), actual: layout([card(40)]) },
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({
      type: 'area',
      area: { x: 150, y: 200, width: 20, height: 20 },
    });
  });

  it('falls back to the pixels without a layout', () => {
    const baseline = cardAt(40);
    const actual = cardAt(40, [200, 30, 30]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
    });
    expect(found[0]).toMatchObject({ type: 'pixels', label: 'content-change' });
    expect(found[1]).toMatchObject({
      type: 'area',
      area: { x: 20, y: 40, width: 100, height: 50 },
    });
  });

  it('says when the screenshot changed size', () => {
    const baseline = cardAt(40);
    const actual = cardAt(40, [200, 30, 30]);
    const found = facts({
      baseline,
      actual,
      mask: maskOf(baseline, actual),
      sizes: {
        baseline: { width: W, height: H - 20 },
        actual: { width: W, height: H },
      },
    });
    expect(found[0].text).toBe('the screenshot changed size 200x280 → 200x300');
  });
  describe('with `only`', () => {
    const PROMO: [number, number, number] = [240, 200, 0];
    const promo = (
      y: number,
      height: number,
      extra: Partial<LayoutNode> = {},
    ) =>
      node('div', [20, y, 100, height], {
        cls: 'promo',
        box: true,
        paint: 'promo',
        ...extra,
      });
    const badge = (paintHash: string) =>
      node('span', [150, 200, 20, 20], {
        cls: 'badge',
        box: true,
        paint: paintHash,
      });
    const draw = (
      promoY: number,
      promoHeight: number,
      cardY: number,
      badgeColor: [number, number, number] = [0, 0, 0],
    ) => {
      const picture = cardAt(cardY);
      paint(
        picture,
        { x: 20, y: promoY, width: 100, height: promoHeight },
        PROMO,
      );
      return paint(
        picture,
        { x: 150, y: 200, width: 20, height: 20 },
        badgeColor,
      );
    };

    it('counts what the element pushed down as its doing', () => {
      const baseline = draw(10, 20, 40);
      const actual = draw(10, 40, 60);
      const found = facts({
        baseline,
        actual,
        mask: maskOf(baseline, actual),
        layout: {
          baseline: layout([promo(10, 20), card(40), badge('b')]),
          actual: layout([promo(10, 40), card(60), badge('b')]),
        },
        only: [[20, 10, 100, 40]],
      });
      expect(found.map(({ text, outside }) => [text, outside])).toEqual([
        ['1 element moved down by 20 px: div.card', false],
        ['div.promo resized 100x20 → 100x40', false],
      ]);
    });

    it('marks a change elsewhere as outside', () => {
      const baseline = draw(10, 20, 40);
      const actual = draw(10, 40, 60, [200, 0, 0]);
      const found = facts({
        baseline,
        actual,
        mask: maskOf(baseline, actual),
        layout: {
          baseline: layout([promo(10, 20), card(40), badge('b')]),
          actual: layout([promo(10, 40), card(60), badge('red')]),
        },
        only: [[20, 10, 100, 40]],
      });
      expect(
        found.filter(({ outside }) => outside).map(({ text }) => text),
      ).toEqual(['look changed on span.badge']);
    });

    it('marks the element as moved by something else when nothing about it changed', () => {
      const baseline = draw(10, 20, 40);
      const actual = draw(18, 20, 48);
      const found = facts({
        baseline,
        actual,
        mask: maskOf(baseline, actual),
        layout: {
          baseline: layout([promo(10, 20), card(40), badge('b')]),
          actual: layout([promo(18, 20), card(48), badge('b')]),
        },
        only: [[20, 18, 100, 20]],
      });
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({
        type: 'move',
        dy: 8,
        elements: 2,
        outside: true,
      });
    });
  });
});
