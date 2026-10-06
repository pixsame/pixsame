import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { tmpDir, writePng } from '../__tests__/helpers';
import { readPngSize } from './png';

describe('readPngSize', () => {
  it('reads the size from the header only', async () => {
    const root = await tmpDir();
    expect(readPngSize(writePng(path.join(root, 'a.png'), 250, 181))).toEqual({
      width: 250,
      height: 181,
    });
  });

  it('is undefined for missing, short or non-PNG files', async () => {
    const root = await tmpDir();
    expect(readPngSize(path.join(root, 'missing.png'))).toBeUndefined();
    const short = path.join(root, 'short.png');
    fs.writeFileSync(short, Buffer.from([0x89, 0x50]));
    expect(readPngSize(short)).toBeUndefined();
    const text = path.join(root, 'text.png');
    fs.writeFileSync(text, 'x'.repeat(40));
    expect(readPngSize(text)).toBeUndefined();
  });
});
