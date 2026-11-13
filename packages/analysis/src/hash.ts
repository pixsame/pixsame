import type { Box, RgbaImage } from './types';

const COLS = 9;
const ROWS = 8;

/**
 * Difference hash (dHash) of the pixels inside `box`: the box is averaged
 * down to 9x8 grey cells and each cell is compared with its right neighbour.
 * 16 hex characters. The same change in two screenshots gives the same hash.
 */
export const regionHash = (image: RgbaImage, box: Box): string => {
  const { data, width } = image;
  const grey = new Float64Array(COLS * ROWS);
  for (let row = 0; row < ROWS; row++) {
    const y0 = box.y + Math.floor((row * box.height) / ROWS);
    const y1 = Math.max(
      y0 + 1,
      box.y + Math.floor(((row + 1) * box.height) / ROWS),
    );
    for (let col = 0; col < COLS; col++) {
      const x0 = box.x + Math.floor((col * box.width) / COLS);
      const x1 = Math.max(
        x0 + 1,
        box.x + Math.floor(((col + 1) * box.width) / COLS),
      );
      let sum = 0;
      let count = 0;
      for (let y = y0; y < y1 && y < image.height; y++) {
        for (let x = x0; x < x1 && x < width; x++) {
          const p = (y * width + x) * 4;
          sum += data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
          count++;
        }
      }
      grey[row * COLS + col] = count === 0 ? 0 : sum / count;
    }
  }
  let hex = '';
  for (let row = 0; row < ROWS; row++) {
    let byte = 0;
    for (let col = 0; col < COLS - 1; col++) {
      byte =
        (byte << 1) |
        (grey[row * COLS + col] > grey[row * COLS + col + 1] ? 1 : 0);
    }
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
};
