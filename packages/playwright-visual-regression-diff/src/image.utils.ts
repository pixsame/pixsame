import sharp from 'sharp';
// named imports: meta-png is a UMD bundle without an ES default export
import { addMetadata, getMetadata } from 'meta-png';
import { DIFF_IMAGES_VERSION, METADATA_KEY } from './constants';

type PluginMetadata = { version: string; testingType?: string };

/** Stamps the plugin marker into the PNG so the file is recognised as plugin output later. */
export const addPNGMetadata = (png: Buffer): Buffer => {
  const stamped = addMetadata(
    new Uint8Array(png),
    METADATA_KEY,
    JSON.stringify({
      version: DIFF_IMAGES_VERSION,
      testingType: 'playwright',
    } satisfies PluginMetadata),
  );
  return Buffer.from(stamped.buffer, stamped.byteOffset, stamped.byteLength);
};

export const getPNGMetadata = (png: Buffer): PluginMetadata | undefined => {
  const metadataString = getMetadata(new Uint8Array(png), METADATA_KEY);
  if (metadataString === undefined) return;
  try {
    return JSON.parse(metadataString);
  } catch {
    return { version: metadataString };
  }
};

export const isImageCurrentVersion = (png: Buffer) =>
  getPNGMetadata(png)?.version === DIFF_IMAGES_VERSION;

export type ImageInfo = { width: number; height: number };

/** Reads the dimensions from the PNG header without decoding pixels. */
export const getImageSize = async (png: Buffer): Promise<ImageInfo> => {
  const { width, height } = await sharp(png).metadata();
  return { width, height };
};

/**
 * Decodes a PNG to 8-bit RGBA pixels. When `size` is larger than the image the
 * canvas is extended (anchored top-left) and the added area is filled with
 * translucent black, exactly like the Cypress plugin pads mismatched sizes.
 */
export const decodePNG = (
  png: Buffer,
  imageSize: ImageInfo,
  size: ImageInfo = imageSize,
) =>
  sharp(png)
    .ensureAlpha()
    .extend({
      right: size.width - imageSize.width,
      bottom: size.height - imageSize.height,
      background: { r: 0, g: 0, b: 0, alpha: 64 / 255 },
    })
    .raw()
    .toBuffer();

export const encodePNG = (raw: Buffer, { width, height }: ImageInfo) =>
  sharp(raw, { raw: { width, height, channels: 4 } })
    .png()
    .toBuffer();
