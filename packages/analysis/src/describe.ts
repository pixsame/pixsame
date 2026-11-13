import type { Region, Shift, Size } from './types';

/**
 * The words of a description, one function per label: a language. English is
 * built in; pass other functions to `analyze` for another language or wording.
 */
export type Descriptions = {
  'size-change': (params: { baseline: Size; actual: Size }) => string;
  moved: (params: Shift) => string;
  /** Every changed area only moved. `offset` is set when they all moved the same way. */
  'moved-areas': (params: {
    regions: number;
    largest: Region;
    offset?: { dx: number; dy: number };
  }) => string;
  'noise-like': (params: { pixels: number; regions: number }) => string;
  'content-change': (params: { regions: number; largest: Region }) => string;
};

const size = ({ width, height }: Size) => `${width}x${height}`;

const direction = ({ dx, dy }: { dx: number; dy: number }) =>
  dy !== 0
    ? `${dy > 0 ? 'down' : 'up'} by ${Math.abs(dy)} px`
    : `${dx > 0 ? 'right' : 'left'} by ${Math.abs(dx)} px`;

const grew = (by: number, more: string, less: string) =>
  by === 0 ? [] : [`${Math.abs(by)} px ${by > 0 ? more : less}`];

export const descriptions: Descriptions = {
  'size-change': ({ baseline, actual }) =>
    `The screenshot is ${[
      ...grew(actual.width - baseline.width, 'wider', 'narrower'),
      ...grew(actual.height - baseline.height, 'taller', 'shorter'),
    ].join(' and ')} than the baseline.`,
  moved: ({ fromX, fromY, dx, dy }) =>
    dy !== 0
      ? `Everything below y=${fromY} moved ${direction({ dx, dy })}.`
      : `Everything right of x=${fromX} moved ${direction({ dx, dy })}.`,
  'moved-areas': ({ regions, largest, offset }) => {
    const where = `${size(largest)} px at x=${largest.x}, y=${largest.y}`;
    if (regions === 1 && offset) {
      return `One area moved ${direction(offset)}: ${where}.`;
    }
    return offset
      ? `${regions} areas moved ${direction(offset)}. The largest is ${where}.`
      : `${regions} areas moved. The largest is ${where}.`;
  },
  'noise-like': ({ pixels }) =>
    `${pixels} ${pixels === 1 ? 'pixel differs' : 'pixels differ'} in tiny scattered spots, which looks like rendering noise.`,
  'content-change': ({ regions, largest }) =>
    regions === 1
      ? `One area changed: ${size(largest)} px at x=${largest.x}, y=${largest.y}.`
      : `${regions} areas changed. The largest is ${size(largest)} px at x=${largest.x}, y=${largest.y}.`,
};
