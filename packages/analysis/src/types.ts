import type { PixelMove } from './blocks';

/** Decoded image: 8-bit RGBA, row by row. */
export type RgbaImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

export type Size = { width: number; height: number };

export type Box = { x: number; y: number; width: number; height: number };

/**
 * Coarse shape of a changed area:
 * - `speck`: at most 4 px on either side;
 * - `band`: spans (almost) the whole width or height and is thin;
 * - `block`: anything else.
 */
export type RegionKind = 'speck' | 'band' | 'block';

export type Region = Box & {
  /** Differing pixels inside the box. */
  area: number;
  /** `area` as a share of the box, 0..1. */
  fillRatio: number;
  kind: RegionKind;
  /** Difference hash of the screenshot's pixels inside the box; the largest regions have one. */
  hash?: string;
};

/** Elements of the page that moved by the same offset, in CSS pixels. */
export type Move = { dx: number; dy: number; elements: number };

export type Label =
  | 'size-change'
  | 'moved'
  | 'moved-and-changed'
  | 'noise-like'
  | 'content-change';

/** What `extra.pixsame.analysis` of a manifest entry holds. */
export type Analysis = {
  /** `ANALYSIS_VERSION` of the package that wrote this. */
  version: number;
  label: Label;
  /** One sentence for a person. */
  description: string;
  /** Changed areas, largest first, at most 50. */
  regions: Region[];
  /** The areas that did not fit in `regions`. */
  truncated?: { count: number; area: number };
  /** Share of the differing pixels that sit in specks; near 1 means rendering noise. */
  speckRatio: number;
  /**
   * Set when the pixels alone showed definite moves (no layout snapshot, or
   * none that explained them): offsets in image pixels, most pixels first. A
   * move is only reported when the answer is definite, so its absence means
   * "no claim", not "nothing moved".
   */
  pixels?: {
    moves: PixelMove[];
    /** Share of the differing pixels explained by a move, 0..1. */
    explained: number;
    /** What no move explains. */
    unexplained: Region[];
  };
  /**
   * Set when a layout snapshot of the page was available: how elements moved,
   * most elements first, and what changed on the page, by element.
   */
  layout?: {
    moves: Move[];
    causes: string[];
    /** Share of the differing pixels the layout explains by a move, 0..1. */
    explained: number;
    /** Areas where the pixels disagree with the layout. */
    unexplained: Region[];
  };
  /** Both sizes, when they differed. */
  sizes?: { baseline: Size; actual: Size };
  /** Entries with the same key changed in the same way. */
  bundleKey: string;
};
