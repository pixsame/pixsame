import { describe, expect, it } from 'vitest';
import {
  getManifestFileName,
  isManifestFileName,
  MANIFEST_FILE_GLOB,
  needsHuman,
} from './constants';

describe('manifest file names', () => {
  it('builds and recognises them', () => {
    expect(getManifestFileName()).toBe('visual-regression-manifest.json');
    expect(getManifestFileName('e2e')).toBe(
      'visual-regression-manifest.e2e.json',
    );
    expect(() => getManifestFileName('a/b')).toThrow(/path separators/);
    expect(() => getManifestFileName('a\\b')).toThrow(/path separators/);
    expect(isManifestFileName('visual-regression-manifest.json')).toBe(true);
    expect(
      isManifestFileName('/a/b/visual-regression-manifest.playwright.w1.json'),
    ).toBe(true);
    expect(isManifestFileName('visual-regression-manifest.json.tmp')).toBe(
      false,
    );
    expect(isManifestFileName('report.json')).toBe(false);
    // files that merely contain the name are not manifests
    expect(isManifestFileName('my-visual-regression-manifest.json')).toBe(
      false,
    );
    expect(isManifestFileName('visual-regression-manifest-notes.json')).toBe(
      false,
    );
    expect(isManifestFileName('visual-regression-manifest.e2e.json.bak')).toBe(
      false,
    );
    expect(MANIFEST_FILE_GLOB).toBe('**/visual-regression-manifest{,.*}.json');
  });

  it('knows which statuses need a human', () => {
    expect(needsHuman('failed')).toBe(true);
    expect(needsHuman('missing-baseline')).toBe(true);
    expect(needsHuman('created')).toBe(false);
    expect(needsHuman('passed')).toBe(false);
  });
});
