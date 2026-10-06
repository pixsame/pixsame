import fs from 'fs';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/**
 * Width and height of a PNG file read from its IHDR chunk, without decoding
 * it. `undefined` when the file is missing or not a PNG.
 */
export const readPngSize = (
  file: string,
): { width: number; height: number } | undefined => {
  let fd: number;
  try {
    fd = fs.openSync(file, 'r');
  } catch {
    return undefined;
  }
  try {
    const header = Buffer.alloc(24);
    const read = fs.readSync(fd, header, 0, 24, 0);
    if (
      read < 24 ||
      !header.subarray(0, 8).equals(PNG_SIGNATURE) ||
      header.toString('latin1', 12, 16) !== 'IHDR'
    ) {
      return undefined;
    }
    return { width: header.readUInt32BE(16), height: header.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
};
