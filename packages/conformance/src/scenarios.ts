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

const created: RunExpectation = {
  outcome: 'pass',
  status: 'created',
  reason: 'created',
  files: { baseline: true, actual: false, diff: false },
  baselineMarked: true,
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
