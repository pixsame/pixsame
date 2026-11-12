import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import {
  addPNGMetadata,
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
    // still a valid image
    const { width, height } = await sharp(stamped).metadata();
    expect({ width, height }).toEqual({ width: 250, height: 181 });
  });
});
