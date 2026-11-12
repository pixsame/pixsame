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
