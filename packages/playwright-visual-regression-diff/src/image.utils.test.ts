import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  addPNGMetadata,
  decodePNG,
  encodePNG,
  getImageSize,
  getPNGMetadata,
  isImageCurrentVersion,
} from './image.utils';

const fixtures = path.resolve(__dirname, '..', '__tests__', 'fixtures');
// the fixture is already stamped (by the Cypress plugin); strip the marker by re-encoding
const png = await sharp(
  fs.readFileSync(path.join(fixtures, 'screenshot.actual.png')),
)
  .png()
  .toBuffer();

describe('image.utils', () => {
  it('stamps and reads the plugin metadata', async () => {
    expect(getPNGMetadata(png)).toBeUndefined();
    expect(isImageCurrentVersion(png)).toBe(false);
    const stamped = addPNGMetadata(png);
    expect(getPNGMetadata(stamped)).toEqual({
      version: '1',
      testingType: 'playwright',
    });
    expect(isImageCurrentVersion(stamped)).toBe(true);
    await expect(getImageSize(stamped)).resolves.toEqual({
      width: 250,
      height: 181,
    });
  });

  it('pads while decoding and encodes back', async () => {
    const size = await getImageSize(png);
    const padded = await decodePNG(png, size, { width: 300, height: 200 });
    expect(padded.length).toBe(300 * 200 * 4);
    // the padded corner is translucent black
    const last = padded.subarray(padded.length - 4);
    expect([...last]).toEqual([0, 0, 0, 64]);
    const encoded = await encodePNG(padded, { width: 300, height: 200 });
    expect(await getImageSize(encoded)).toEqual({ width: 300, height: 200 });
  });
});
