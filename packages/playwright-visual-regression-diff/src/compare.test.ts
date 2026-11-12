import { describe, expect, it } from 'vitest';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { dir, setGracefulCleanup } from 'tmp-promise';
import {
  compareImages as compare,
  createComparison,
  type CompareInput,
} from './compare';
import { getPNGMetadata, isImageCurrentVersion } from './image.utils';

setGracefulCleanup();

const getImageSize = async (png: Buffer) => {
  const { width, height } = await sharp(png).metadata();
  return { width, height };
};
const comparer = await createComparison(null, { rootDir: process.cwd() });
const compareImages = (input: CompareInput) => compare(input, comparer);

const fixtures = path.resolve(__dirname, '..', '__tests__', 'fixtures');
// 125x125 and 250x181 images that differ in size and content; both carry the plugin marker
const oldImg = fs.readFileSync(path.join(fixtures, 'screenshot.png'));
const newImg = fs.readFileSync(path.join(fixtures, 'screenshot.actual.png'));
// the same 250x181 image without the marker, as a hand-made baseline would be
const unstampedImg = await sharp(newImg).png().toBuffer();

const setup = async (
  overrides: Partial<CompareInput> = {},
  { baseline = oldImg as Buffer | null } = {},
) => {
  const { path: root } = await dir();
  const actualPath = path.join(root, 'shots', 'home_#0.actual.png');
  const baselinePath = path.join(root, 'shots', 'home_#0.png');
  if (baseline) {
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, baseline);
  }
  const input: CompareInput = {
    imgNew: newImg,
    actualPath,
    baselinePath,
    createMissingImages: true,
    updateImages: false,
    maxDiffThreshold: 0.01,
    diffConfig: {},
    ...overrides,
  };
  return {
    input,
    actualPath,
    baselinePath,
    diffPath: actualPath.replace('.actual', '.diff'),
  };
};

describe('compareImages', () => {
  it('passes for an identical screenshot and leaves only the baseline behind', async () => {
    const { input, actualPath, baselinePath, diffPath } = await setup({
      imgNew: oldImg,
    });
    // a stale diff from an earlier failure must go away
    fs.writeFileSync(diffPath, 'stale');

    const result = await compareImages(input);

    expect(result).toMatchObject({
      status: 'passed',
      error: false,
      diffRatio: 0,
      baselineWritten: false,
    });
    expect(result.message).toMatch(/Identical to the baseline/);
    expect(fs.existsSync(actualPath)).toBe(false);
    expect(fs.existsSync(diffPath)).toBe(false);
    expect(fs.readFileSync(baselinePath).equals(oldImg)).toBe(true);
    // same-size images are handed back as the bytes on disk
    expect(result.imgOld?.equals(oldImg)).toBe(true);
    expect(isImageCurrentVersion(result.imgNew as Buffer)).toBe(true);
  });

  it('fails above the threshold, keeps the .actual.png and writes a padded, stamped .diff.png', async () => {
    const { input, actualPath, diffPath } = await setup();

    const result = await compareImages(input);

    expect(result).toMatchObject({
      status: 'failed',
      error: true,
      baselineWritten: false,
    });
    expect(result.diffRatio).toBeGreaterThan(0.01);
    expect(result.message).toMatch(/the limit is 1%/);
    expect(result.message).toMatch(/padded to the same size/);
    expect(getPNGMetadata(fs.readFileSync(diffPath))).toEqual({
      version: '1',
      testingType: 'playwright',
    });
    expect(fs.existsSync(actualPath)).toBe(true);
    const diff = fs.readFileSync(diffPath);
    expect(await getImageSize(diff)).toEqual({ width: 250, height: 181 });
    // both compared images come back at the common size
    expect(await getImageSize(result.imgOld as Buffer)).toEqual({
      width: 250,
      height: 181,
    });
  });

  it('passes with a high threshold and refreshes a baseline without the plugin marker', async () => {
    const { input, baselinePath, actualPath } = await setup(
      { imgNew: oldImg, maxDiffThreshold: 1 },
      { baseline: oldImg },
    );
    expect(isImageCurrentVersion(oldImg)).toBe(true);
    const { input: unstamped, baselinePath: unstampedBaseline } = await setup(
      { imgNew: newImg, maxDiffThreshold: 1 },
      { baseline: unstampedImg },
    );
    expect(isImageCurrentVersion(unstampedImg)).toBe(false);

    expect(await compareImages(input)).toMatchObject({
      status: 'passed',
      baselineWritten: false,
    });
    expect(fs.existsSync(actualPath)).toBe(false);
    expect(fs.readFileSync(baselinePath).equals(oldImg)).toBe(true);

    expect(await compareImages(unstamped)).toMatchObject({
      status: 'passed',
      baselineWritten: true,
    });
    expect(isImageCurrentVersion(fs.readFileSync(unstampedBaseline))).toBe(
      true,
    );
  });

  it("updates the baseline on failure with updateImages: 'failures-only'", async () => {
    const { input, actualPath, baselinePath, diffPath } = await setup({
      updateImages: 'failures-only',
    });

    const result = await compareImages(input);

    expect(result).toMatchObject({
      status: 'updated',
      error: false,
      baselineWritten: true,
    });
    expect(result.message).toMatch(/replaced with the actual screenshot/);
    expect(fs.existsSync(actualPath)).toBe(false);
    expect(fs.existsSync(diffPath)).toBe(false);
    expect(await getImageSize(fs.readFileSync(baselinePath))).toEqual({
      width: 250,
      height: 181,
    });
  });

  it('overwrites without comparing with updateImages: true', async () => {
    const { input, baselinePath } = await setup({ updateImages: true });
    const result = await compareImages(input);
    expect(result).toMatchObject({
      status: 'updated',
      diffRatio: 0,
      baselineWritten: true,
    });
    expect(result.imgOld).toBeUndefined();
    expect(await getImageSize(fs.readFileSync(baselinePath))).toEqual({
      width: 250,
      height: 181,
    });
  });

  it('overwrites a baseline with the same pixels, too, with updateImages: true', async () => {
    const { input } = await setup(
      { imgNew: oldImg, updateImages: true },
      { baseline: oldImg },
    );
    expect(await compareImages(input)).toMatchObject({
      status: 'updated',
      baselineWritten: true,
    });
  });

  it('still fails on a missing baseline with updateImages: true and createMissingImages off', async () => {
    const { input } = await setup(
      { updateImages: true, createMissingImages: false },
      { baseline: null },
    );
    expect(await compareImages(input)).toMatchObject({
      status: 'missing-baseline',
      error: true,
    });
  });

  it('creates a missing baseline, stamped', async () => {
    const { input, actualPath, baselinePath } = await setup(
      {},
      { baseline: null },
    );
    const result = await compareImages(input);
    expect(result).toMatchObject({
      status: 'created',
      error: false,
      baselineWritten: true,
    });
    expect(fs.existsSync(actualPath)).toBe(false);
    expect(isImageCurrentVersion(fs.readFileSync(baselinePath))).toBe(true);
  });

  it('fails on a missing baseline when createMissingImages is off and keeps the .actual.png', async () => {
    const { input, actualPath, baselinePath } = await setup(
      { createMissingImages: false },
      { baseline: null },
    );
    const result = await compareImages(input);
    expect(result).toMatchObject({ status: 'missing-baseline', error: true });
    // relative to the project root, with the way out
    expect(result.message).toBe(
      `Baseline image is missing at path: "${path.relative(process.cwd(), baselinePath).split(path.sep).join('/')}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
    );
    expect(fs.existsSync(actualPath)).toBe(true);
    expect(fs.existsSync(baselinePath)).toBe(false);
  });
});
