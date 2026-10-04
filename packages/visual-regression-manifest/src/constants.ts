import path from 'path';
import type { ManifestStatus } from './types';

/** Format version written into `Manifest.version`; bumped on breaking changes only. */
export const MANIFEST_VERSION = 1 as const;

/**
 * Every writer names its file `visual-regression-manifest[.<label>].json`, so
 * CI tooling finds all manifests of a run (several machines, e2e + component,
 * one file per worker) with a single glob.
 */
export const MANIFEST_FILE_PREFIX = 'visual-regression-manifest';
/** Glob (picomatch/minimatch syntax) matching every manifest file inside an artifact, and nothing named merely alike. */
export const MANIFEST_FILE_GLOB = `**/${MANIFEST_FILE_PREFIX}{,.*}.json`;
const MANIFEST_FILE_REGEX = new RegExp(
  `^${MANIFEST_FILE_PREFIX}(\\..+)?\\.json$`,
);

/** `visual-regression-manifest.json`, or `visual-regression-manifest.<label>.json` (e.g. `e2e`, `playwright.w0`). */
export const getManifestFileName = (label?: string) => {
  if (label && /[\\/]/.test(label)) {
    throw new Error(
      `Manifest label ${JSON.stringify(label)} must not contain path separators`,
    );
  }
  return `${MANIFEST_FILE_PREFIX}${label ? `.${label}` : ''}.json`;
};

/** Whether a file name (or path) is one a manifest writer would produce. */
export const isManifestFileName = (file: string) =>
  MANIFEST_FILE_REGEX.test(path.basename(file));

/** Suffixes of the sibling images written next to a baseline `<name>.png`. */
export const IMAGE_SUFFIX = { actual: '.actual', diff: '.diff' } as const;

export const MANIFEST_STATUSES = [
  'passed',
  'failed',
  'missing-baseline',
  'created',
  'updated',
  'approved',
] as const satisfies readonly ManifestStatus[];

/** Entries a human has to look at: nothing was written to the baseline and the comparison did not pass. */
export const NEEDS_HUMAN_STATUSES: readonly ManifestStatus[] = [
  'failed',
  'missing-baseline',
];

export const needsHuman = (status: ManifestStatus) =>
  NEEDS_HUMAN_STATUSES.includes(status);
