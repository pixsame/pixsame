import fs from 'node:fs';
import sharp from 'sharp';
import type { RunExpectation, Scenario, Workspace } from './types.js';

/** Re-encoding drops the text chunks, so the package marker is gone. */
const stripMarker = async (ws: Workspace) => {
  const baseline = ws.baseline();
  if (!baseline) throw new Error('no baseline to strip the marker from');
  fs.writeFileSync(
    baseline,
    await sharp(fs.readFileSync(baseline)).png().toBuffer(),
  );
};

/** An old baseline: from before layouts existed. Only the layout chunk goes, the package marker stays. */
const stripLayout = (ws: Workspace) => {
  const baseline = ws.baseline();
  if (!baseline) throw new Error('no baseline to strip the layout from');
  const png = fs.readFileSync(baseline);
  const kept: Buffer[] = [png.subarray(0, 8)];
  for (let at = 8; at + 12 <= png.length;) {
    const end = at + 12 + png.readUInt32BE(at);
    const isLayout =
      png.toString('latin1', at + 4, at + 8) === 'iTXt' &&
      png.toString('latin1', at + 8, at + 8 + 14) === 'pixsame-layout';
    if (!isLayout) kept.push(png.subarray(at, end));
    at = end;
  }
  fs.writeFileSync(baseline, Buffer.concat(kept));
};

const created: RunExpectation = {
  outcome: 'pass',
  status: 'created',
  reason: 'created',
  files: { baseline: true, actual: false, diff: false },
  baselineMarked: true,
  baselineHasLayout: true,
};

const bannerFailure: RunExpectation = {
  outcome: 'fail',
  status: 'failed',
  reason: 'above-limit',
  analysis: {
    label: 'moved-and-changed',
    description:
      /moved down by \d+ px\. Changed: added div\.promo "Free shipping"\./,
  },
  files: { baseline: true, actual: true, diff: true },
  baselineUnchanged: true,
};

const passed: RunExpectation = {
  outcome: 'pass',
  status: 'passed',
  reason: ['identical', 'within-limit'],
  files: { baseline: true, actual: false, diff: false },
};

/**
 * Shared behavior first (every adapter must agree), then the pixsame-specific
 * features. A scenario without `runners` applies to both runners.
 */
export const scenarios: Scenario[] = [
  {
    name: 'creates a baseline, then passes against it',
    runs: [
      { fixture: 'blue', expect: created },
      { fixture: 'blue', expect: { ...passed, baselineUnchanged: true } },
    ],
  },
  {
    name: 'fails on a visible change and keeps the review files',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'red',
        expect: {
          outcome: 'fail',
          status: 'failed',
          reason: 'above-limit',
          message: /pixels \(.*%\) differ; the limit is/,
          analysis: {
            label: 'content-change',
            description: /One area changed: \d+x\d+ px at x=\d+, y=\d+\./,
          },
          files: { baseline: true, actual: true, diff: true },
          baselineUnchanged: true,
        },
      },
    ],
  },
  {
    name: 'says that content moved and what was added, from the page layout',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'banner',
        expect: {
          outcome: 'fail',
          status: 'failed',
          reason: 'above-limit',
          analysis: {
            label: 'moved-and-changed',
            description:
              /moved down by \d+ px\. Changed: added div\.promo "Free shipping"\./,
          },
          files: { baseline: true, actual: true, diff: true },
          baselineUnchanged: true,
        },
      },
    ],
  },
  {
    name: 'describes a move and an addition in a viewport capture',
    runs: [
      { fixture: 'blue', capture: 'viewport', expect: created },
      { fixture: 'banner', capture: 'viewport', expect: bannerFailure },
    ],
  },
  {
    name: 'describes a move and an addition in an element capture',
    runs: [
      { fixture: 'blue', capture: 'element', expect: created },
      { fixture: 'banner', capture: 'element', expect: bannerFailure },
    ],
  },
  {
    name: 'still compares against a baseline from before layouts, and leaves it alone',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'blue',
        before: stripLayout,
        expect: {
          ...passed,
          baselineHasLayout: false,
          baselineUnchanged: true,
          oldBaselineNotice: true,
        },
      },
      {
        // no layout to go by: the description comes from the pixels alone
        fixture: 'red',
        expect: {
          outcome: 'fail',
          status: 'failed',
          reason: 'above-limit',
          analysis: {
            label: 'content-change',
            description: /One area changed: \d+x\d+ px at x=\d+, y=\d+\./,
          },
          files: { baseline: true, actual: true, diff: true },
          baselineHasLayout: false,
          baselineUnchanged: true,
          oldBaselineNotice: true,
        },
      },
    ],
  },
  {
    name: 'gives an old baseline its layout when updateImages replaces it',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'red',
        before: stripLayout,
        options: { updateImages: 'failures-only' },
        expect: {
          outcome: 'pass',
          status: 'updated',
          reason: 'updated',
          files: { baseline: true, actual: false, diff: false },
          baselineHasLayout: true,
          oldBaselineNotice: false,
        },
      },
      {
        fixture: 'red',
        before: stripLayout,
        options: { updateImages: true },
        expect: {
          outcome: 'pass',
          status: 'updated',
          reason: 'updated',
          files: { baseline: true, actual: false, diff: false },
          baselineHasLayout: true,
          oldBaselineNotice: false,
        },
      },
    ],
  },
  {
    name: 'compares a screenshot of another size by padding both images',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'tall',
        expect: {
          outcome: 'fail',
          status: 'failed',
          reason: 'above-limit',
          message: /padded to the same size/,
          analysis: {
            label: 'size-change',
            description: /The screenshot is \d+ px taller than the baseline\./,
          },
          files: { baseline: true, actual: true, diff: true },
        },
      },
    ],
  },
  {
    name: 'fails without a baseline when createMissingImages is off',
    runs: [
      {
        fixture: 'blue',
        options: { createMissingImages: false },
        expect: {
          outcome: 'fail',
          status: 'missing-baseline',
          reason: 'missing-baseline',
          message: /createMissingImages/,
          files: { baseline: false },
        },
      },
    ],
  },
  {
    name: 'updateImages: true replaces the baseline without comparing',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'red',
        options: { updateImages: true },
        expect: {
          outcome: 'pass',
          status: 'updated',
          reason: 'updated',
          files: { baseline: true, actual: false, diff: false },
          baselineMarked: true,
        },
      },
      { fixture: 'red', expect: passed },
    ],
  },
  {
    name: "updateImages: 'failures-only' replaces only a failing baseline",
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'red',
        options: { updateImages: 'failures-only' },
        expect: {
          outcome: 'pass',
          status: 'updated',
          reason: 'updated',
          files: { baseline: true, actual: false, diff: false },
          baselineMarked: true,
        },
      },
      {
        fixture: 'red',
        options: { updateImages: 'failures-only' },
        expect: { ...passed, baselineUnchanged: true },
      },
    ],
  },
  {
    name: 'refreshes a passing baseline that lost the package marker, silently',
    runs: [
      { fixture: 'blue', expect: created },
      {
        fixture: 'blue',
        before: stripMarker,
        expect: { ...passed, baselineMarked: true },
      },
    ],
  },
  {
    name: 'keeps baselines per platform with the {platform} path token',
    runs: [
      {
        fixture: 'blue',
        imagesPath: '{spec_path}/__image_snapshots__/{platform}',
        expect: { ...created, baselineInPlatformDir: true },
      },
      {
        fixture: 'blue',
        imagesPath: '{spec_path}/__image_snapshots__/{platform}',
        expect: { ...passed, baselineInPlatformDir: true },
      },
    ],
  },
];
