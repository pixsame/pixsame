import type { Box, RgbaImage } from './types';

type Color = [number, number, number];

export const image = (
  width: number,
  height: number,
  [r, g, b]: Color = [255, 255, 255],
): RgbaImage => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let at = 0; at < data.length; at += 4) {
    data.set([r, g, b, 255], at);
  }
  return { width, height, data };
};

export const paint = (
  target: RgbaImage,
  { x, y, width, height }: Box,
  [r, g, b]: Color,
): RgbaImage => {
  for (let py = y; py < y + height; py++) {
    for (let px = x; px < x + width; px++) {
      target.data.set([r, g, b, 255], (py * target.width + px) * 4);
    }
  }
  return target;
};

export const clone = (source: RgbaImage): RgbaImage => ({
  ...source,
  data: new Uint8ClampedArray(source.data),
});

/** Every pixel whose bytes differ. */
export const maskOf = (a: RgbaImage, b: RgbaImage): Uint8Array => {
  const mask = new Uint8Array(a.width * a.height);
  for (let at = 0; at < mask.length; at++) {
    const p = at * 4;
    if (
      a.data[p] !== b.data[p] ||
      a.data[p + 1] !== b.data[p + 1] ||
      a.data[p + 2] !== b.data[p + 2] ||
      a.data[p + 3] !== b.data[p + 3]
    ) {
      mask[at] = 1;
    }
  }
  return mask;
};

/** A page with distinct rows: a few coloured blocks on white. */
export const page = (width = 200, height = 300): RgbaImage => {
  const target = image(width, height);
  for (let i = 0; i < 12; i++) {
    paint(
      target,
      {
        x: 10 + ((i * 13) % 60),
        y: 10 + i * 22,
        width: 60 + i * 5,
        height: 12,
      },
      [(i * 53) % 256, (i * 97) % 256, (i * 31) % 256],
    );
  }
  return target;
};
