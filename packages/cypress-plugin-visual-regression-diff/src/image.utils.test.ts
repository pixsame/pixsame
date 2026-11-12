import { it, expect, describe } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { decodePNG, encodePNG, getImageSize, scaleImage } from './image.utils';

const fixturesPath = path.resolve(__dirname, '..', '__tests__', 'fixtures');
const readFixture = (name: string) =>
  fs.readFile(path.join(fixturesPath, name));

// 2x2 image: red, green / blue, white
const rgbSize = { width: 2, height: 2 };
const rgbPixels = Buffer.from([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
const rgbPNG = () =>
  sharp(rgbPixels, { raw: { ...rgbSize, channels: 3 } })
    .png()
    .toBuffer();
const pixelAt = (data: Buffer, width: number, x: number, y: number) => [
  ...data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4),
];

describe('getImageSize', () => {
  it('reads the dimensions of a PNG', async () => {
    expect(await getImageSize(await rgbPNG())).toEqual(rgbSize);
  });
});

describe('decodePNG', () => {
  it('decodes to RGBA even when the PNG has no alpha channel', async () => {
    const data = await decodePNG(await rgbPNG(), rgbSize);

    expect(data).toHaveLength(2 * 2 * 4);
    expect(pixelAt(data, 2, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, 2, 1, 1)).toEqual([255, 255, 255, 255]);
  });

  it('extends the canvas to the right and bottom with translucent black', async () => {
    const size = { width: 4, height: 3 };

    const data = await decodePNG(await rgbPNG(), rgbSize, size);

    expect(data).toHaveLength(size.width * size.height * 4);
    // original pixels stay anchored top-left
    expect(pixelAt(data, 4, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(pixelAt(data, 4, 1, 1)).toEqual([255, 255, 255, 255]);
    // padded area
    expect(pixelAt(data, 4, 2, 0)).toEqual([0, 0, 0, 64]);
    expect(pixelAt(data, 4, 0, 2)).toEqual([0, 0, 0, 64]);
    expect(pixelAt(data, 4, 3, 2)).toEqual([0, 0, 0, 64]);
  });
});

describe('encodePNG', () => {
  it('round-trips raw RGBA pixels', async () => {
    const png = await readFixture('screenshot.png');
    const size = await getImageSize(png);
    const data = await decodePNG(png, size);

    const encoded = await encodePNG(data, size);

    expect(await getImageSize(encoded)).toEqual(size);
    expect((await decodePNG(encoded, size)).equals(data)).toBe(true);
  });
});

describe('scaleImage', () => {
  it('returns the very same buffer when scaleFactor is 1', async () => {
    const original = await readFixture('screenshot.png');

    expect(await scaleImage(original, 1)).toBe(original);
  });

  it('scales the image by the given factor', async () => {
    const result = await scaleImage(await readFixture('screenshot.png'), 0.5);

    expect(await getImageSize(result)).toEqual({ width: 63, height: 63 });
  });
});
