/** x, y, width, height in CSS pixels of the screenshot's area. */
export type Rect = [number, number, number, number];

/** One element of a layout snapshot. */
export type LayoutNode = {
  tag: string;
  rect: Rect;
  id?: string;
  cls?: string;
  /** Not drawn: `visibility: hidden` or no size. `display: none` elements have no children. */
  hidden?: boolean;
  /** The element's own text, whitespace collapsed. */
  text?: string;
  /** One rectangle per line box of that text. */
  lines?: Rect[];
  /** Hash of the styles that change how the element looks. */
  paint?: string;
  /** The element draws a box of its own: a background, border, shadow, outline or media. */
  box?: boolean;
  /** Stretching it changes its pixels: a picture or a gradient. */
  scales?: boolean;
  media?: boolean;
  /** Hash of the picture source. */
  src?: string;
  kids: LayoutNode[];
};

/**
 * What a page looked like when a screenshot was taken: every element with its
 * rectangle, own text, text line boxes and a hash of its look. Plain JSON.
 * Rectangles are relative to the top left of the screenshot, in CSS pixels.
 */
export type Layout = {
  /** CSS pixels of the screenshot's area. */
  size: { width: number; height: number };
  /** Image pixels per CSS pixel, measured from the image. */
  scale: number;
  count: number;
  root: LayoutNode;
};
