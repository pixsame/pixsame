import { descriptions as english, type Descriptions } from './describe';
import { regionHash } from './hash';
import { findRegions } from './regions';
import { detectRegionShift, detectShift } from './shift';
import type { Analysis, Label, RgbaImage, Size } from './types';

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
  descriptions?: Partial<Descriptions>;
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
  const shift = detectShift(baseline, actual);
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
  // areas that moved on their own (a badge, a sidebar), when the page as a whole did not
  const parts = regions.filter((region) => region.kind !== 'speck');
  if (!resized && !shift) {
    for (const region of parts) {
      const moved = detectRegionShift(baseline, actual, region);
      if (moved) region.moved = moved;
    }
  }
  const allMoved =
    !truncated && parts.length > 0 && parts.every((region) => region.moved);

  let label: Label;
  let description: string;
  let bundleKey: string;
  if (resized) {
    label = 'size-change';
    description = words['size-change'](sizes);
    bundleKey = `size:${sizes.baseline.width}x${sizes.baseline.height}>${sizes.actual.width}x${sizes.actual.height}`;
  } else if (shift) {
    label = 'moved';
    description = words.moved(shift);
    bundleKey = `moved:${shift.dx},${shift.dy}`;
  } else if (allMoved && largest) {
    const { dx, dy } = largest.moved as { dx: number; dy: number };
    const same = parts.every(
      (region) => region.moved?.dx === dx && region.moved?.dy === dy,
    );
    label = 'moved';
    description = words['moved-areas']({
      regions: parts.length,
      largest: parts[0],
      ...(same && { offset: { dx, dy } }),
    });
    bundleKey = `moved-area:${dx},${dy}:${parts[0].width}x${parts[0].height}:${parts[0].hash ?? regionHash(actual, parts[0])}`;
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

  return {
    version: 1,
    label,
    description,
    regions,
    ...(truncated && { truncated }),
    speckRatio,
    shift,
    ...(resized && { sizes }),
    bundleKey,
  };
};
