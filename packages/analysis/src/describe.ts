import type { PixelMove } from './blocks';
import type { Move, Region, Size } from './types';

/**
 * The words of a description, one function per label: a language. English is
 * built in; pass other functions to `analyze` for another language or wording.
 */
export type Descriptions = {
  'size-change': (params: { baseline: Size; actual: Size }) => string;
  /** Elements moved and nothing else changed (from a layout snapshot). */
  'moved-elements': (params: { moves: Move[] }) => string;
  /** Elements moved and something changed too; `causes` name the changes (from a layout snapshot). */
  'moved-and-changed': (params: {
    moves: Move[];
    causes: string[];
    unexplained: Region[];
  }) => string;
  /** Content moved and nothing else changed, found from the pixels alone. */
  'moved-content': (params: { moves: PixelMove[] }) => string;
  /** Content moved and something else changed too, found from the pixels alone. */
  'moved-content-and-changed': (params: {
    moves: PixelMove[];
    unexplained: Region[];
  }) => string;
  'noise-like': (params: { pixels: number; regions: number }) => string;
  'content-change': (params: { regions: number; largest: Region }) => string;
};

const size = ({ width, height }: Size) => `${width}x${height}`;

const direction = ({ dx, dy }: { dx: number; dy: number }) =>
  [
    ...(dy !== 0 ? [`${dy > 0 ? 'down' : 'up'} by ${Math.abs(dy)} px`] : []),
    ...(dx !== 0 ? [`${dx > 0 ? 'right' : 'left'} by ${Math.abs(dx)} px`] : []),
  ].join(' and ');

const grew = (by: number, more: string, less: string) =>
  by === 0 ? [] : [`${Math.abs(by)} px ${by > 0 ? more : less}`];

const others = (count: number) =>
  `${count} other ${count === 1 ? 'offset' : 'offsets'} elsewhere`;

const movedWhat = (moves: Move[]) => {
  const [top, ...rest] = moves;
  if (!top) return 'Content moved';
  const count = (n: number) => (n === 1 ? 'One element' : `${n} elements`);
  const single = `${count(top.elements)} moved ${direction(top)}`;
  return rest.length === 0 ? single : `${single}, and ${others(rest.length)}`;
};

const movedContent = (moves: PixelMove[]) => {
  const [top, ...rest] = moves;
  if (!top) return 'Content moved';
  const single = `Content moved ${direction(top)}`;
  return rest.length === 0 ? single : `${single}, and ${others(rest.length)}`;
};

const somethingElse = (unexplained: Region[]) => {
  const [largest] = unexplained;
  if (!largest) return 'Something else changed too.';
  const where = `${size(largest)} px at x=${largest.x}, y=${largest.y}`;
  return unexplained.length === 1
    ? `Something else changed too: ${where}.`
    : `Something else changed too, in ${unexplained.length} areas. The largest is ${where}.`;
};

export const descriptions: Descriptions = {
  'size-change': ({ baseline, actual }) =>
    `The screenshot is ${[
      ...grew(actual.width - baseline.width, 'wider', 'narrower'),
      ...grew(actual.height - baseline.height, 'taller', 'shorter'),
    ].join(' and ')} than the baseline.`,
  'moved-elements': ({ moves }) => `${movedWhat(moves)}.`,
  'moved-and-changed': ({ moves, causes, unexplained }) => {
    const moved = moves.length > 0 ? `${movedWhat(moves)}. ` : '';
    const what =
      causes.length > 0
        ? `Changed: ${causes.join('; ')}.`
        : somethingElse(unexplained);
    return `${moved}${what}`;
  },
  'moved-content': ({ moves }) => `${movedContent(moves)}.`,
  'moved-content-and-changed': ({ moves, unexplained }) =>
    `${movedContent(moves)}. ${somethingElse(unexplained)}`,
  'noise-like': ({ pixels }) =>
    `${pixels} ${pixels === 1 ? 'pixel differs' : 'pixels differ'} in tiny scattered spots, which looks like rendering noise.`,
  'content-change': ({ regions, largest }) =>
    regions === 1
      ? `One area changed: ${size(largest)} px at x=${largest.x}, y=${largest.y}.`
      : `${regions} areas changed. The largest is ${size(largest)} px at x=${largest.x}, y=${largest.y}.`,
};
