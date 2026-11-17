import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { OLD_BASELINES_NOTICE } from '@pixsame/analysis';
import { oldBaselinesNotice } from './notice.utils';

describe('oldBaselinesNotice', () => {
  it('returns the notice once per output folder', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pixsame-notice-'));
    try {
      expect(oldBaselinesNotice(dir)).toBe(OLD_BASELINES_NOTICE);
      expect(oldBaselinesNotice(dir)).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('stays quiet when the folder cannot be written', () => {
    expect(oldBaselinesNotice('/dev/null/nope')).toBeUndefined();
  });
});
