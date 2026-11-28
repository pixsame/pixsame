import type { Fact } from './facts';
import type { Analysis, RgbaImage } from './types';

/** What a pin marks; a viewer colours by it. */
export type PinKind =
  'changed' | 'added' | 'removed' | 'moved' | 'resized' | 'unexplained';

type Box = { x: number; y: number; width: number; height: number };

/** One fact that has a place on the screenshot. */
export type Pin = {
  /** From 1; the number drawn on the image and written in a list next to it. */
  number: number;
  kind: PinKind;
  /** The image it is true for: a removed element is only on the baseline, an added one only on the screenshot. */
  side: 'baseline' | 'actual' | 'both';
  /** Where, in image pixels; a group that moved has one box per element named. */
  boxes: Box[];
  /** For a move: how far it went, in image pixels. */
  moved?: { dx: number; dy: number };
  text: string;
};

export type Pins = {
  pins: Pin[];
  /** The facts with no place on the image, and those that did not fit, as sentences. */
  rest: string[];
};

/** As many facts get a pin. More would cover the screenshot. */
const MAX_PINS = 10;
/** Pins whose corners are closer than this (CSS pixels) would cover each other: they become one. */
const MERGE_WITHIN = 16;

const boxOf = (
  [x, y, width, height]: readonly number[],
  scale: number,
): Box => ({
  x: Math.round(x * scale),
  y: Math.round(y * scale),
  width: Math.max(1, Math.round(width * scale)),
  height: Math.max(1, Math.round(height * scale)),
});

const placeOf = (
  fact: Fact,
  scale: number,
): Pick<Pin, 'kind' | 'side' | 'boxes' | 'moved'> | undefined => {
  switch (fact.type) {
    case 'element': {
      const added = fact.kinds.includes('added');
      const removed = fact.kinds.includes('removed');
      return {
        kind: added ? 'added' : removed ? 'removed' : 'changed',
        side: added ? 'actual' : removed ? 'baseline' : 'both',
        boxes: [boxOf(fact.rect, scale)],
      };
    }
    case 'style':
      return {
        kind: 'changed',
        side: 'both',
        boxes: [boxOf(fact.rect, scale)],
      };
    case 'resize':
      return {
        kind: 'resized',
        side: 'actual',
        boxes: [boxOf(fact.rect, scale)],
      };
    case 'move':
      return fact.rects?.length
        ? {
            kind: 'moved',
            side: 'actual',
            boxes: fact.rects.map((rect) => boxOf(rect, scale)),
            moved: {
              dx: Math.round(fact.dx * scale),
              dy: Math.round(fact.dy * scale),
            },
          }
        : undefined;
    case 'area': {
      const { x, y, width, height } = fact.area;
      return {
        kind: 'unexplained',
        side: 'both',
        boxes: [{ x, y, width, height }],
      };
    }
    default:
      return undefined;
  }
};

/**
 * The facts of an analysis as pins on the screenshot, numbered in the order
 * of the facts, and what is left to say in words. Facts that start at the
 * same corner share one pin. `scale` is image pixels per
 * CSS pixel (a layout's `scale`); an analysis carries its own.
 */
export const pinsOf = (
  {
    facts = [],
    factsOmitted = 0,
    scale = 1,
  }: Pick<Analysis, 'facts' | 'factsOmitted' | 'scale'>,
  limit = MAX_PINS,
): Pins => {
  const pins: Pin[] = [];
  const rest: string[] = [];
  let unpinned = factsOmitted;
  for (const fact of facts) {
    const place = placeOf(fact, scale);
    if (!place) {
      rest.push(fact.text);
      continue;
    }
    // a second change at the same corner (a button that was restyled and
    // resized) shares the first one's pin
    const [corner] = place.boxes;
    const near = pins.find(
      ({ boxes: [first] }) =>
        Math.abs(first.x - corner.x) < MERGE_WITHIN * scale &&
        Math.abs(first.y - corner.y) < MERGE_WITHIN * scale,
    );
    if (near) {
      near.text = `${near.text}; ${fact.text}`;
      if (near.side !== place.side) near.side = 'both';
      for (const box of place.boxes) {
        if (
          !near.boxes.some(
            (has) =>
              has.x === box.x &&
              has.y === box.y &&
              has.width === box.width &&
              has.height === box.height,
          )
        )
          near.boxes.push(box);
      }
    } else if (pins.length >= limit) unpinned++;
    else pins.push({ number: pins.length + 1, ...place, text: fact.text });
  }
  if (unpinned > 0)
    rest.push(
      `${unpinned} more ${unpinned === 1 ? 'change is' : 'changes are'} not shown.`,
    );
  return { pins, rest };
};

/** The colour of each kind of pin, for viewers that want the same ones. */
export const PIN_COLORS: Record<PinKind, string> = {
  changed: '#d97706',
  added: '#16a34a',
  removed: '#dc2626',
  moved: '#2563eb',
  resized: '#7c3aed',
  unexplained: '#db2777',
};

type Color = [number, number, number];
const rgb = (hex: string): Color => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];
const WHITE: Color = [255, 255, 255];

// digits as seven segments, so that a number is drawn without a font:
// top, top-left, top-right, middle, bottom-left, bottom-right, bottom
const SEGMENTS = [
  '1110111',
  '0010010',
  '1011101',
  '1011011',
  '0111010',
  '1101011',
  '1101111',
  '1010010',
  '1111111',
  '1111011',
];
/** Each segment as x, y, width, height in a 6x11 cell. */
const BARS = [
  [0, 0, 6, 2],
  [0, 0, 2, 6],
  [4, 0, 2, 6],
  [0, 4, 6, 2],
  [0, 5, 2, 6],
  [4, 5, 2, 6],
  [0, 9, 6, 2],
];
const BADGE = 17;
const LINE = 2;

/**
 * A copy of the image with the pins of one side drawn on it: an outline
 * around each box, its number in a badge at the corner, and for a move a
 * dotted line from where it was. For a report that can only show a picture.
 */
export const drawPins = (
  image: RgbaImage,
  pins: Pin[],
  side: 'baseline' | 'actual' = 'actual',
): { width: number; height: number; data: Uint8ClampedArray } => {
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data);
  // a number that can be read on a full page, and that fits on a small element
  const k = width >= 600 ? 2 : 1;
  const badge = BADGE * k;
  const fill = (
    x: number,
    y: number,
    w: number,
    h: number,
    [r, g, b]: Color,
  ) => {
    const x1 = Math.min(width, Math.round(x + w));
    const y1 = Math.min(height, Math.round(y + h));
    for (let py = Math.max(0, Math.round(y)); py < y1; py++) {
      for (let px = Math.max(0, Math.round(x)); px < x1; px++) {
        const at = (py * width + px) * 4;
        data[at] = r;
        data[at + 1] = g;
        data[at + 2] = b;
        data[at + 3] = 255;
      }
    }
  };
  const outline = (box: Box, color: Color, dashed: boolean) => {
    const on = (at: number) => !dashed || Math.floor(at / 6) % 2 === 0;
    for (let x = box.x; x < box.x + box.width; x++) {
      if (!on(x - box.x)) continue;
      fill(x, box.y, 1, LINE, color);
      fill(x, box.y + box.height - LINE, 1, LINE, color);
    }
    for (let y = box.y; y < box.y + box.height; y++) {
      if (!on(y - box.y)) continue;
      fill(box.x, y, LINE, 1, color);
      fill(box.x + box.width - LINE, y, LINE, 1, color);
    }
  };
  for (const { number, kind, boxes, moved, side: on } of pins) {
    if (on !== 'both' && on !== side) continue;
    const color = rgb(PIN_COLORS[kind]);
    boxes.forEach((box, i) => {
      outline(box, color, kind === 'unexplained');
      if (i > 0) return;
      if (moved) {
        // dots from the old corner to the new one
        const steps = Math.max(Math.abs(moved.dx), Math.abs(moved.dy));
        for (let step = 0; step < steps; step += 5) {
          fill(
            box.x - moved.dx + (moved.dx * step) / steps,
            box.y - moved.dy + (moved.dy * step) / steps,
            LINE,
            LINE,
            color,
          );
        }
      }
      const digits = String(number).split('').map(Number);
      const w = (digits.length * 8 + 9) * k;
      // in the top left corner of a large box, where it covers nothing of
      // another element; above a small one, which it would hide
      const large = box.width >= w * 3 && box.height >= badge * 3;
      const bx = Math.min(
        Math.max(0, large ? box.x : box.x - 2),
        Math.max(0, width - w),
      );
      const by = Math.min(
        Math.max(0, large ? box.y : box.y - badge + 2),
        Math.max(0, height - badge),
      );
      fill(bx, by, w, badge, WHITE);
      fill(bx + k, by + k, w - 2 * k, badge - 2 * k, color);
      digits.forEach((value, at) => {
        BARS.forEach(([x, y, bw, bh], segment) => {
          if (SEGMENTS[value][segment] === '1')
            fill(
              bx + (5 + at * 8 + x) * k,
              by + (3 + y) * k,
              bw * k,
              bh * k,
              WHITE,
            );
        });
      });
    });
  }
  return { width, height, data };
};
