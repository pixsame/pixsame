// Browser-safe on purpose: this file is also published as `@pixsame/analysis/snapshot`,
// which a Cypress support file bundles, so it imports nothing but types.
import type { LayoutNode, Rect } from './types';

// The page's globals; the package's own typings have no DOM.
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const document: any;
declare const getComputedStyle: (el: any, pseudo?: string) => any;

/** What `snapshotLayout` returns, before the adapter adds the size and scale. */
export type RawLayout = { count: number; root: LayoutNode };

/**
 * Takes a layout snapshot of the page. It runs inside the page, so it has to be
 * self-contained: no imports, no helpers from outside, and nothing the
 * compiler turns into a helper. An adapter passes it to `page.evaluate` (or
 * `cy.window().then`) with the `origin` the screenshot's top left has in the
 * page: the scroll position for a viewport capture, an element's corner for an
 * element capture.
 */
export const snapshotLayout = (origin: [number, number]): RawLayout => {
  const PAINT = [
    'color',
    'background-color',
    'background-image',
    'background-size',
    'background-position',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-style',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'box-shadow',
    'outline-style',
    'outline-width',
    'outline-color',
    'opacity',
    'filter',
    'backdrop-filter',
    'mix-blend-mode',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'letter-spacing',
    'word-spacing',
    'text-decoration-line',
    'text-shadow',
    'text-transform',
    'clip-path',
    'object-fit',
    'fill',
    'stroke',
    'list-style-type',
  ];
  const SKIP = ['script', 'style', 'head', 'template', 'noscript'];
  const MEDIA = ['img', 'canvas', 'svg', 'video', 'iframe'];
  const hash = (text: string): string => {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    }
    return (h >>> 0).toString(36);
  };
  const round = (n: number) => Math.round(n * 100) / 100;
  const rectOf = (r: any): Rect => [
    round(r.x - origin[0]),
    round(r.y - origin[1]),
    round(r.width),
    round(r.height),
  ];
  const styleOf = (cs: any) =>
    PAINT.map((p) => cs.getPropertyValue(p)).join('|');
  let count = 0;

  const walk = (el: any): LayoutNode => {
    count++;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tag = String(el.tagName).toLowerCase();
    const hidden =
      cs.display === 'none' ||
      cs.visibility === 'hidden' ||
      r.width === 0 ||
      r.height === 0;
    const node: LayoutNode = { tag, rect: rectOf(r), kids: [] };
    if (el.id) node.id = el.id;
    if (typeof el.className === 'string' && el.className) {
      node.cls = el.className;
    }
    if (hidden) {
      node.hidden = true;
      if (cs.display === 'none') return node;
    }
    let own = '';
    const lines: Rect[] = [];
    for (const child of el.childNodes) {
      if (child.nodeType !== 3 || !child.textContent.trim()) continue;
      own += child.textContent;
      const range = document.createRange();
      range.selectNodeContents(child);
      for (const q of range.getClientRects()) lines.push(rectOf(q));
    }
    own = own.replace(/\s+/g, ' ').trim();
    if (own) {
      node.text = own;
      node.lines = lines;
    }
    let paint = styleOf(cs);
    for (const pseudo of ['::before', '::after']) {
      const ps = getComputedStyle(el, pseudo);
      if (ps.content !== 'none' && ps.content !== 'normal') {
        paint += pseudo + ps.content + styleOf(ps);
      }
    }
    node.paint = hash(paint);
    const border = ['top', 'right', 'bottom', 'left'].some(
      (side) => parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0,
    );
    const media = MEDIA.includes(tag);
    if (
      media ||
      border ||
      cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      cs.backgroundImage !== 'none' ||
      cs.boxShadow !== 'none' ||
      (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0)
    ) {
      node.box = true;
    }
    if (media || cs.backgroundImage !== 'none') node.scales = true;
    if (media) node.media = true;
    if (el.currentSrc) node.src = hash(el.currentSrc);
    for (const child of el.children) {
      if (SKIP.includes(String(child.tagName).toLowerCase())) continue;
      node.kids.push(walk(child));
    }
    return node;
  };

  const root = walk(document.documentElement);
  return { count, root };
};
