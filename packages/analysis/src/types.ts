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
  /** Set when the content of this area only moved, by this many pixels. */
  moved?: { dx: number; dy: number };
};

/**
 * The whole screenshot equals the baseline moved by `dy` rows from row `fromY`
 * down, or by `dx` columns from column `fromX` to the right, for `coverage` of
 * those lines. One of `dx` and `dy` is 0, and so is the `from` of the other
 * direction.
 */
export type Shift = {
  fromX: number;
  fromY: number;
  dx: number;
  dy: number;
  coverage: number;
};

export type Label = 'size-change' | 'moved' | 'noise-like' | 'content-change';

/** What `extra.pixsame.analysis` of a manifest entry holds. */
export type Analysis = {
  version: 1;
  label: Label;
  /** One sentence for a person. */
  description: string;
  /** Changed areas, largest first, at most 50. */
  regions: Region[];
  /** The areas that did not fit in `regions`. */
  truncated?: { count: number; area: number };
  /** Share of the differing pixels that sit in specks; near 1 means rendering noise. */
  speckRatio: number;
  /** A move of everything below a row or right of a column; `null` when searched and not found. Areas that moved on their own have `moved` set instead. */
  shift: Shift | null;
  /** Both sizes, when they differed. */
  sizes?: { baseline: Size; actual: Size };
  /** Entries with the same key changed in the same way. */
  bundleKey: string;
};
