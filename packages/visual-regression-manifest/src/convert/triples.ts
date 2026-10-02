import fs from 'fs';
import path from 'path';
import {
  actualSiblingOf,
  diffSiblingOf,
  ManifestBuilder,
  type ManifestHeaderInput,
} from '../builder';
import { resolveInProject } from '../paths';
import { readPngSize } from '../png';
import type {
  Manifest,
  ManifestEntryOptions,
  ManifestEntryPlatform,
  ManifestRenderer,
  ManifestStatus,
  ManifestTarget,
  ManifestViewport,
} from '../types';

/**
 * One screenshot as a set of files: the baseline, and the actual and diff
 * images a comparison left behind. Paths are absolute or relative to
 * `projectRoot`; files need not exist.
 */
export type ImageTriple = {
  baseline: string;
  /** Defaults to `<baseline>.actual.<ext>` next to the baseline. */
  actual?: string;
  /** Defaults to `<baseline>.diff.<ext>` next to the baseline; `null` when the tool writes none. */
  diff?: string | null;
  /** Defaults to the baseline file stem. */
  name?: string;
  testFile?: string;
  titlePath?: string[];
  retry?: number;
  /** Inferred from which files exist when absent (see `inferStatus`). */
  status?: ManifestStatus;
  diffRatio?: number;
  threshold?: number;
  baselineWritten?: boolean;
  message?: string;
  platform?: ManifestEntryPlatform;
  target?: ManifestTarget;
  variant?: string;
  viewport?: ManifestViewport;
  options?: ManifestEntryOptions;
  renderer?: ManifestRenderer;
};

export type FromImageTriplesInput = ManifestHeaderInput & {
  triples: readonly ImageTriple[];
};

/**
 * What a set of files says about the comparison: an actual image next to a
 * baseline means it differed (with or without a diff image), an actual image
 * without a baseline means there was nothing to compare against, a baseline
 * alone means the comparison passed and the tool cleaned up.
 */
export const inferStatus = (exists: {
  baseline: boolean;
  actual: boolean;
}): ManifestStatus => {
  if (exists.actual) return exists.baseline ? 'failed' : 'missing-baseline';
  return exists.baseline ? 'passed' : 'missing-baseline';
};

/**
 * Builds a manifest from plain image files, for tools that write no manifest
 * of their own. Sizes are read from the PNG headers of the files that exist.
 */
export const fromImageTriples = ({
  triples,
  ...header
}: FromImageTriplesInput): Manifest => {
  const builder = new ManifestBuilder(header);
  for (const triple of triples) {
    const baselineAbs = resolveInProject(builder.projectRoot, triple.baseline);
    const actualAbs = triple.actual
      ? resolveInProject(builder.projectRoot, triple.actual)
      : actualSiblingOf(baselineAbs);
    const diffPath =
      triple.diff === undefined
        ? diffSiblingOf(actualAbs)
        : triple.diff === null
          ? null
          : resolveInProject(builder.projectRoot, triple.diff);
    builder.record({
      actualPath: actualAbs,
      baselinePath: baselineAbs,
      diffPath,
      name:
        triple.name ?? path.basename(baselineAbs, path.extname(baselineAbs)),
      testFile: triple.testFile,
      titlePath: triple.titlePath,
      retry: triple.retry,
      status:
        triple.status ??
        inferStatus({
          baseline: fs.existsSync(baselineAbs),
          actual: fs.existsSync(actualAbs),
        }),
      diffRatio: triple.diffRatio,
      threshold: triple.threshold,
      baselineWritten: triple.baselineWritten,
      message: triple.message,
      baselineSize: readPngSize(baselineAbs),
      actualSize: readPngSize(actualAbs),
      platform: triple.platform,
      target: triple.target,
      variant: triple.variant,
      viewport: triple.viewport,
      options: triple.options,
      renderer: triple.renderer,
    });
  }
  return builder.toJSON();
};
