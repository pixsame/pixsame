import fs from 'fs';
import path from 'path';

export const toPosix = (p: string) =>
  path.sep === '/' ? p : p.split(path.sep).join('/');

export const unlinkSafe = (file: string) => {
  if (fs.existsSync(file)) fs.unlinkSync(file);
};

/** Moves a file, falling back to copy + delete when the target is on another device. */
export const moveFile = (from: string, to: string) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  try {
    fs.renameSync(from, to);
  } catch (error) {
    /* c8 ignore next 4 */
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error;
    fs.copyFileSync(from, to);
    fs.unlinkSync(from);
  }
};

export const writeFileEnsuringDir = (file: string, data: Buffer | string) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};
