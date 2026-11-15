import type { Move, Region, Shift, Size } from './types';

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
  /** Elements moved and nothing else changed. */
  'moved-elements': (params: { moves: Move[] }) => string;
  /** Elements moved and something changed too; `causes` name the changes. */
  'moved-and-changed': (params: {
    moves: Move[];
    causes: string[];
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

const movedWhat = (moves: Move[]) => {
  const [top, ...rest] = moves;
  if (!top) return 'Content moved';
  const count = (n: number) => (n === 1 ? 'One element' : `${n} elements`);
  const single = `${count(top.elements)} moved ${direction(top)}`;
  return rest.length === 0
    ? single
    : `${single}, and ${rest.length} more ${rest.length === 1 ? 'offset' : 'offsets'} elsewhere`;
};

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
  'moved-elements': ({ moves }) => `${movedWhat(moves)}.`,
  'moved-and-changed': ({ moves, causes, unexplained }) => {
    const moved = moves.length > 0 ? `${movedWhat(moves)}. ` : '';
    const what =
      causes.length > 0
        ? `Changed: ${causes.join('; ')}.`
        : unexplained.length > 0
          ? `Something else changed too: ${size(unexplained[0])} px at x=${unexplained[0].x}, y=${unexplained[0].y}.`
          : 'Something else changed too.';
    return `${moved}${what}`;
  },
  'noise-like': ({ pixels }) =>
    `${pixels} ${pixels === 1 ? 'pixel differs' : 'pixels differ'} in tiny scattered spots, which looks like rendering noise.`,
  'content-change': ({ regions, largest }) =>
    regions === 1
      ? `One area changed: ${size(largest)} px at x=${largest.x}, y=${largest.y}.`
      : `${regions} areas changed. The largest is ${size(largest)} px at x=${largest.x}, y=${largest.y}.`,
};
