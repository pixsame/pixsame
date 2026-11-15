import { deflateSync, inflateSync } from 'node:zlib';
import type { Layout, LayoutNode, Rect } from './types';

/**
 * Columns of a snapshot, one entry per element in document order: the tree
 * flattened into parallel arrays, strings once in a table, rectangles as
 * integers (hundredths of a pixel) with each `y` relative to the previous
 * element. Plain JSON that compresses about 15% better than the tree.
 */
type Columns = {
  size: [number, number];
  scale: number;
  count: number;
  strings: string[];
  tag: number[];
  kids: number[];
  x: number[];
  y: number[];
  w: number[];
  h: number[];
  flags: number[];
  id: number[];
  cls: number[];
  text: number[];
  paint: number[];
  src: number[];
  lineCount: number[];
  lines: number[];
};

const HIDDEN = 1;
const BOX = 2;
const SCALES = 4;
const MEDIA = 8;

const hundredths = (value: number) => Math.round(value * 100);

/** The snapshot as columns. */
export const toColumns = (layout: Layout): Columns => {
  const strings: string[] = [];
  const index = new Map<string, number>();
  const str = (value: string | undefined) => {
    if (value === undefined) return -1;
    let at = index.get(value);
    if (at === undefined) {
      at = strings.length;
      strings.push(value);
      index.set(value, at);
    }
    return at;
  };
  const c: Columns = {
    size: [layout.size.width, layout.size.height],
    scale: layout.scale,
    count: layout.count,
    strings,
    tag: [],
    kids: [],
    x: [],
    y: [],
    w: [],
    h: [],
    flags: [],
    id: [],
    cls: [],
    text: [],
    paint: [],
    src: [],
    lineCount: [],
    lines: [],
  };
  let previousY = 0;
  const walk = (n: LayoutNode) => {
    const [x, y, w, h] = n.rect.map(hundredths);
    c.tag.push(str(n.tag));
    c.kids.push(n.kids.length);
    c.x.push(x);
    c.y.push(y - previousY);
    previousY = y;
    c.w.push(w);
    c.h.push(h);
    c.flags.push(
      (n.hidden ? HIDDEN : 0) |
        (n.box ? BOX : 0) |
        (n.scales ? SCALES : 0) |
        (n.media ? MEDIA : 0),
    );
    c.id.push(str(n.id));
    c.cls.push(str(n.cls));
    c.text.push(str(n.text));
    c.paint.push(str(n.paint));
    c.src.push(str(n.src));
    c.lineCount.push(n.lines?.length ?? 0);
    for (const line of n.lines ?? []) c.lines.push(...line.map(hundredths));
    n.kids.forEach(walk);
  };
  walk(layout.root);
  return c;
};

/** The snapshot back from its columns. */
export const fromColumns = (c: Columns): Layout => {
  let at = 0;
  let line = 0;
  let previousY = 0;
  const str = (i: number) => (i < 0 ? undefined : c.strings[i]);
  const walk = (): LayoutNode => {
    const i = at++;
    const y = previousY + c.y[i];
    previousY = y;
    const rect: Rect = [c.x[i], y, c.w[i], c.h[i]].map((v) => v / 100) as Rect;
    const node: LayoutNode = { tag: str(c.tag[i]) as string, rect, kids: [] };
    const id = str(c.id[i]);
    if (id !== undefined) node.id = id;
    const cls = str(c.cls[i]);
    if (cls !== undefined) node.cls = cls;
    if (c.flags[i] & HIDDEN) node.hidden = true;
    const text = str(c.text[i]);
    if (text !== undefined) {
      node.text = text;
      node.lines = [];
      for (let k = 0; k < c.lineCount[i]; k++, line += 4) {
        node.lines.push(
          c.lines.slice(line, line + 4).map((v) => v / 100) as Rect,
        );
      }
    }
    const paint = str(c.paint[i]);
    if (paint !== undefined) node.paint = paint;
    if (c.flags[i] & BOX) node.box = true;
    if (c.flags[i] & SCALES) node.scales = true;
    if (c.flags[i] & MEDIA) node.media = true;
    const src = str(c.src[i]);
    if (src !== undefined) node.src = src;
    for (let k = 0; k < c.kids[i]; k++) node.kids.push(walk());
    return node;
  };
  const root = walk();
  return {
    size: { width: c.size[0], height: c.size[1] },
    scale: c.scale,
    count: c.count,
    root,
  };
};

/** The snapshot as UTF-8 JSON in columns, deflated. */
export const encodeLayout = (layout: Layout): Uint8Array =>
  deflateSync(Buffer.from(JSON.stringify(toColumns(layout))), { level: 9 });

/** Reads what `encodeLayout` wrote; `undefined` when it is not that. */
export const decodeLayout = (bytes: Uint8Array): Layout | undefined => {
  try {
    return fromColumns(JSON.parse(inflateSync(bytes).toString('utf8')));
  } catch {
    return undefined;
  }
};
