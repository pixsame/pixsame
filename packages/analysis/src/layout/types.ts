/**
 * What rendered a screenshot, as far as it decides how text and edges look:
 * the operating system (`process.platform` names: `darwin`, `linux`, `win32`),
 * the browser and its version, and a renderer such as a Docker image.
 */
export type Environment = {
  os: string;
  browser?: string;
  browserVersion?: string;
  renderer?: string;
};

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
  /** Hash of the font family of the element's own text; set only where there is text. */
  font?: string;
  kids: LayoutNode[];
};

/**
 * What a page looked like when a screenshot was taken: every element with its
 * rectangle, own text, text line boxes and a hash of its look. Plain JSON.
 * Rectangles are relative to the top left of the screenshot, in CSS pixels.
 */
export type Layout = {
  /** What rendered the screenshot; adapters add it, a snapshot taken in the page cannot know it. */
  env?: Environment;
  /** CSS pixels of the screenshot's area. */
  size: { width: number; height: number };
  /** Image pixels per CSS pixel, measured from the image. */
  scale: number;
  count: number;
  root: LayoutNode;
};
