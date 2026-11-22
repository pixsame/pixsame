import { findMoves } from './blocks';
import { descriptions as english, type Descriptions } from './describe';
import { regionHash } from './hash';
import { ANALYSIS_VERSION } from './version';
import { diffLayouts, has, LAYOUT, CHANGE, type Kind } from './layout/diff';
import type { Environment, Layout } from './layout/types';
import { causesOf, checkAgainstPixels } from './layout/verify';
import { findRegions } from './regions';
import type { Analysis, Label, Move, RgbaImage, Size } from './types';

/** Regions that get a hash: the ones a person would look at. */
const HASHED_REGIONS = 5;
/** Specks make up at least this share of the differing pixels. */
const NOISE_SPECK_RATIO = 0.9;
/** Or every area is this sparse: a few scattered pixels in a large box. */
const NOISE_FILL_RATIO = 0.03;

export type AnalyzeInput = {
  /** Both images as they were compared: the same size. */
  baseline: RgbaImage;
  actual: RgbaImage;
  /** 1 for every pixel that counted as different, row by row. */
  mask: Uint8Array;
  /** The sizes before any padding or cropping, when known. */
  sizes?: { baseline: Size; actual: Size };
  /** What the page looked like when each screenshot was taken. */
  layout?: { baseline: Layout; actual: Layout };
  /**
   * What rendered each image. When the systems differ, the analysis says so,
   * and when the page's layout shows nothing but what another system causes it
   * answers `cross-os`. Unknown for a baseline saved before this was recorded.
   */
  environment?: { baseline?: Environment; actual?: Environment };
  descriptions?: Partial<Descriptions>;
};

/** Changes another system causes on its own: a different default font, text that sits a little differently. */
const SYSTEM_KINDS: Kind[] = ['font', 'entered'];

/** Offsets closer than this (CSS pixels) are one offset. */
const OFFSET_STEP = 0.1;
const MAX_MOVES = 5;

const movesOf = (pairs: ReturnType<typeof diffLayouts>['layout']): Move[] => {
  const tally = new Map<string, Move>();
  for (const { a, b, kinds } of pairs) {
    if (!a || !b || !kinds.includes('moved')) continue;
    const dx = Math.round((b.rect[0] - a.rect[0]) / OFFSET_STEP) * OFFSET_STEP;
    const dy = Math.round((b.rect[1] - a.rect[1]) / OFFSET_STEP) * OFFSET_STEP;
    const key = `${dx.toFixed(1)},${dy.toFixed(1)}`;
    const entry = tally.get(key) ?? {
      dx: Number(dx.toFixed(1)),
      dy: Number(dy.toFixed(1)),
      elements: 0,
    };
    entry.elements++;
    tally.set(key, entry);
  }
  return [...tally.values()]
    .sort((m, n) => n.elements - m.elements)
    .slice(0, MAX_MOVES);
};

/**
 * What changed between two images, from the pixels alone: the changed areas,
 * whether content only moved, whether it looks like noise, one sentence about
 * it and a key shared by entries that changed in the same way. Deterministic;
 * it never decides whether the comparison passes.
 */
export const analyze = ({
  baseline,
  actual,
  mask,
  sizes,
  layout,
  environment,
  descriptions,
}: AnalyzeInput): Analysis => {
  const words = { ...english, ...descriptions };
  const { width, height } = actual;
  const { regions, truncated, diffPixels } = findRegions(mask, width, height);
  regions.slice(0, HASHED_REGIONS).forEach((region) => {
    if (region.kind !== 'speck') region.hash = regionHash(actual, region);
  });
  const speckPixels = regions.reduce(
    (sum, region) => sum + (region.kind === 'speck' ? region.area : 0),
    0,
  );
  const speckRatio = diffPixels === 0 ? 0 : speckPixels / diffPixels;
  const resized =
    sizes !== undefined &&
    (sizes.baseline.width !== sizes.actual.width ||
      sizes.baseline.height !== sizes.actual.height);
  const regionCount = regions.length + (truncated?.count ?? 0);
  const noisy =
    !truncated &&
    regions.length > 0 &&
    (speckRatio >= NOISE_SPECK_RATIO ||
      regions.every(
        (region) =>
          region.kind === 'speck' || region.fillRatio < NOISE_FILL_RATIO,
      ));
  const largest = regions[0];
  // images from different systems, when both are known
  const systems =
    environment?.baseline &&
    environment.actual &&
    environment.baseline.os !== environment.actual.os
      ? { baseline: environment.baseline, actual: environment.actual }
      : undefined;
  // the page's own layout, checked against the pixels
  const sameArea =
    layout !== undefined &&
    layout.actual.size.width > 0 &&
    layout.baseline.size.width > 0;
  const layoutResult = (() => {
    if (!layout || !sameArea || regions.length === 0) return undefined;
    const diff = diffLayouts(layout.baseline, layout.actual);
    const checked = checkAgainstPixels({
      diff,
      before: layout.baseline,
      after: layout.actual,
      baseline,
      actual,
      mask,
    });
    return {
      verdict: checked.verdict,
      moves: movesOf(
        diff.layout.filter((pair) => !has(pair, CHANGE) && has(pair, LAYOUT)),
      ),
      causes: causesOf(checked.real),
      explained:
        checked.shares.verified + checked.shares.approx + checked.shares.trust,
      unexplained: checked.doubt,
      // nothing the other system cannot explain: no element added, removed, restyled or re-texted, and no pixels the page's text cannot account for
      // moved elements whatever else happened to them, for the sentence about another system
      anyMoves: movesOf(diff.pairs),
      systemOnly:
        checked.real.every((pair) =>
          pair.kinds
            .filter((kind) => CHANGE.includes(kind))
            .every((kind) => SYSTEM_KINDS.includes(kind)),
        ) && !checked.doubtOnMedia,
    };
  })();
  // only elements that really moved: a page that grew resizes its body, which is not a move
  const layoutMoved =
    layoutResult &&
    layoutResult.verdict !== 'changed' &&
    layoutResult.moves.length > 0
      ? layoutResult
      : undefined;

  // without a layout to go by, the pixels alone: only a definite answer counts
  const pixelMoves =
    !layoutResult && !noisy && regions.length > 0
      ? findMoves({ baseline, actual, mask, sizes })
      : undefined;

  let label: Label;
  let description: string;
  let bundleKey: string;
  if (systems && layoutResult?.systemOnly) {
    label = 'cross-os';
    description = words['cross-os']({
      ...systems,
      moves: layoutResult.anyMoves,
    });
    bundleKey = `cross-os:${systems.baseline.os}>${systems.actual.os}`;
  } else if (layoutMoved) {
    const { moves, causes, unexplained } = layoutMoved;
    const only = layoutMoved.verdict === 'moved';
    label = only ? 'moved' : 'moved-and-changed';
    description = only
      ? words['moved-elements']({ moves })
      : words['moved-and-changed']({ moves, causes, unexplained });
    const top = moves[0];
    bundleKey = `${only ? 'moved' : 'moved-changed'}:${top ? `${top.dx},${top.dy}` : 'none'}${only ? '' : `:${causes.join('|')}`}`;
  } else if (pixelMoves) {
    const { moves, unexplained } = pixelMoves;
    const only = pixelMoves.verdict === 'moved';
    label = pixelMoves.verdict;
    description = only
      ? words['moved-content']({ moves })
      : words['moved-content-and-changed']({ moves, unexplained });
    const top = moves[0];
    bundleKey = `${only ? 'moved' : 'moved-changed'}:${top.dx},${top.dy}${only ? '' : `:${unexplained[0].width}x${unexplained[0].height}:${unexplained[0].hash ?? regionHash(actual, unexplained[0])}`}`;
  } else if (resized) {
    label = 'size-change';
    description = words['size-change'](sizes);
    bundleKey = `size:${sizes.baseline.width}x${sizes.baseline.height}>${sizes.actual.width}x${sizes.actual.height}`;
  } else if (noisy || !largest) {
    label = 'noise-like';
    description = words['noise-like']({
      pixels: diffPixels,
      regions: regionCount,
    });
    bundleKey = 'noise';
  } else {
    label = 'content-change';
    description = words['content-change']({ regions: regionCount, largest });
    bundleKey = `change:${largest.width}x${largest.height}:${largest.hash ?? regionHash(actual, largest)}`;
  }

  // a system difference that was not shown to be the whole story is still worth saying
  if (systems && label !== 'cross-os') {
    description = `${description} ${words['other-system'](systems)}`;
  }

  return {
    version: ANALYSIS_VERSION,
    label,
    description,
    regions,
    ...(truncated && { truncated }),
    speckRatio,
    ...(pixelMoves && {
      pixels: {
        moves: pixelMoves.moves,
        explained: pixelMoves.explained,
        unexplained: pixelMoves.unexplained,
      },
    }),
    ...(layoutResult && {
      layout: {
        moves: layoutResult.moves,
        causes: layoutResult.causes,
        explained: layoutResult.explained,
        unexplained: layoutResult.unexplained,
      },
    }),
    ...(resized && { sizes }),
    ...(environment &&
      (environment.baseline || environment.actual) && { environment }),
    bundleKey,
  };
};
