import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectCi, type EnvLike } from './ci';
import { IMAGE_SUFFIX, MANIFEST_VERSION } from './constants';
import {
  compareText,
  resolveInProject,
  toPosix,
  toProjectRelative,
} from './paths';
import type {
  Manifest,
  ManifestCi,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestEntryPlatform,
  ManifestHashes,
  ManifestHeader,
  ManifestPlatform,
  ManifestRenderer,
  ManifestRunner,
  ManifestStatus,
  ManifestUpload,
  ManifestTarget,
  ManifestViewport,
} from './types';

export type ImageSize = { width: number; height: number };

export type ManifestHeaderInput = {
  /** Absolute path every relative path in the manifest resolves against. */
  projectRoot: string;
  runner: ManifestRunner;
  /** Global tool options as configured. */
  options?: Record<string, unknown>;
  /** Defaults to the machine this runs on. */
  platform?: ManifestPlatform;
  /** `null` means "not on CI"; when absent, detected from `env`. */
  ci?: ManifestCi | null;
  /** Environment to detect CI from; defaults to `process.env`. */
  env?: EnvLike;
  /** ISO 8601; defaults to now. */
  createdAt?: string;
  upload?: ManifestUpload;
};

export type ManifestEntryInput = {
  /** The `.actual` image, absolute or relative to `projectRoot`. Recording the same path again replaces the entry. */
  actualPath: string;
  /** The baseline image, absolute or relative to `projectRoot`; need not exist. */
  baselinePath: string;
  /** Defaults to the `.diff` sibling of `actualPath`; `null` when the tool writes no diff image. */
  diffPath?: string | null;
  /** Defaults to the actual file stem without `.actual`, i.e. the baseline stem. */
  name?: string;
  /** Test file, absolute or relative to `projectRoot`; empty when unknown. */
  testFile?: string;
  titlePath?: string[];
  retry?: number;
  status: ManifestStatus;
  diffRatio?: number;
  threshold?: number;
  baselineWritten?: boolean;
  message?: string;
  baselineSize?: ImageSize;
  actualSize?: ImageSize;
  platform?: ManifestEntryPlatform;
  target?: ManifestTarget;
  /** Tells entries of the same screenshot name apart when manifests get merged. */
  variant?: string;
  viewport?: ManifestViewport;
  options?: ManifestEntryOptions;
  /** Defaults to a `native` renderer derived from `platform.browser`. */
  renderer?: ManifestRenderer;
  /** ISO 8601; defaults to now. */
  recordedAt?: string;
};

export type ManifestApproveInput = {
  /** The `.actual` image that was moved over the baseline, absolute or relative to `projectRoot`. */
  actualPath: string;
  /** Defaults to `actualPath` without the `.actual` suffix. */
  baselinePath?: string;
  /** Used only when nothing was recorded for the screenshot before. */
  testFile?: string;
  message?: string;
};

export const now = () => new Date().toISOString();

/** `platform` of the machine this process runs on. */
export const hostPlatform = (): ManifestPlatform => ({
  os: process.platform,
  arch: process.arch,
  osVersion: os.release(),
});

/** Fills the defaults of a run header: timestamp, host platform, CI detection, empty options. */
export const createManifestHeader = (
  input: ManifestHeaderInput,
): ManifestHeader => ({
  createdAt: input.createdAt ?? now(),
  projectRoot: input.projectRoot,
  platform: input.platform ?? hostPlatform(),
  ci: input.ci === undefined ? detectCi(input.env ?? process.env) : input.ci,
  options: input.options ?? {},
  runner: input.runner,
  ...(input.upload && { upload: input.upload }),
});

const stemOf = (file: string) => path.basename(file, path.extname(file));

/** Baseline stem of an image path: `home.actual.png` -> `home`, `home.png` -> `home`. */
export const nameFromImagePath = (file: string) => {
  const stem = stemOf(file);
  return stem.endsWith(IMAGE_SUFFIX.actual)
    ? stem.slice(0, -IMAGE_SUFFIX.actual.length)
    : stem;
};

const sibling = (file: string, suffix: string) =>
  path.join(
    path.dirname(file),
    `${nameFromImagePath(file)}${suffix}${path.extname(file)}`,
  );

/** `home.actual.png` -> `home.diff.png`; `null` when the path has no `.actual` suffix. */
export const diffSiblingOf = (actualPath: string) =>
  stemOf(actualPath).endsWith(IMAGE_SUFFIX.actual)
    ? sibling(actualPath, IMAGE_SUFFIX.diff)
    : null;

/** `home.actual.png` -> `home.png`. */
export const baselineSiblingOf = (actualPath: string) =>
  sibling(actualPath, '');

/** `home.png` -> `home.actual.png`. */
export const actualSiblingOf = (baselinePath: string) =>
  sibling(baselinePath, IMAGE_SUFFIX.actual);

const sha256 = (file: string) =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** sha256 of the files that exist; a key is present only when the file is. */
export const hashesOf = (files: {
  baseline: string;
  actual: string | null;
  diff: string | null;
}): ManifestHashes => {
  const hashes: ManifestHashes = {};
  for (const key of ['baseline', 'actual', 'diff'] as const) {
    const file = files[key];
    if (file && fs.existsSync(file)) hashes[key] = sha256(file);
  }
  return hashes;
};

/** A screenshot taken by the runner's own browser: the renderer is that browser. */
export const nativeRenderer = (
  platform: ManifestEntryPlatform | undefined,
): ManifestRenderer | undefined =>
  platform?.browser && {
    backend: 'native',
    browser: platform.browser.name,
    ...(platform.browser.version && {
      browserVersion: platform.browser.version,
    }),
  };

const sameTitlePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((part, i) => part === b[i]);

/** The order entries are written in: by test file, then name. */
export const compareEntries = (a: ManifestEntry, b: ManifestEntry) =>
  compareText(a.test.file, b.test.file) || compareText(a.name, b.name);

/**
 * Builds a manifest in memory: one run header plus entries keyed by their
 * `.actual` path. Runner-agnostic; a test-runner integration maps its own
 * vocabulary onto `record()` and persists with `writeManifestFile()`, or uses
 * `ManifestWriter`, which does both.
 */
export class ManifestBuilder {
  readonly header: ManifestHeader;
  private readonly byActualPath = new Map<string, ManifestEntry>();

  constructor(header: ManifestHeaderInput) {
    this.header = createManifestHeader(header);
  }

  get projectRoot() {
    return this.header.projectRoot;
  }

  /** Number of entries recorded so far. */
  get size() {
    return this.byActualPath.size;
  }

  private relative(absolute: string) {
    return toProjectRelative(this.projectRoot, absolute);
  }

  private existingOrNull(absolute: string | null) {
    return absolute && fs.existsSync(absolute) ? this.relative(absolute) : null;
  }

  /** `./a.spec.ts` and `a.spec.ts` are one file: identity must not depend on how a runner spells it. */
  private testFile(file: string | undefined) {
    if (!file) return '';
    return path.isAbsolute(file)
      ? this.relative(path.normalize(file))
      : path.posix.normalize(toPosix(file));
  }

  /** Records one comparison. A retried test replaces the entries of its earlier attempts. */
  record(input: ManifestEntryInput): ManifestEntry {
    const actualAbs = resolveInProject(this.projectRoot, input.actualPath);
    const baselineAbs = resolveInProject(this.projectRoot, input.baselinePath);
    const diffAbs =
      input.diffPath === undefined
        ? diffSiblingOf(actualAbs)
        : input.diffPath === null
          ? null
          : resolveInProject(this.projectRoot, input.diffPath);
    // a passing comparison leaves no review images behind, so `.actual` and
    // `.diff` files found next to it are leftovers of an earlier run and must
    // not show up as part of this entry
    const passed = input.status === 'passed';
    const keptActual = passed ? null : actualAbs;
    const keptDiff = passed ? null : diffAbs;
    const test = {
      file: this.testFile(input.testFile),
      titlePath: input.titlePath ?? [],
      retry: input.retry ?? 0,
    };

    // a retried test regenerates its screenshots from scratch, so entries
    // left by an earlier attempt of the same test are stale
    // (without a known test identity every entry shares `('', [])`, so
    // there is nothing to tell attempts of one test from other tests)
    if (test.retry > 0 && (test.file || test.titlePath.length > 0)) {
      for (const [key, entry] of this.byActualPath) {
        if (
          entry.test.retry < test.retry &&
          entry.test.file === test.file &&
          sameTitlePath(entry.test.titlePath, test.titlePath)
        ) {
          this.byActualPath.delete(key);
        }
      }
    }

    const entry: ManifestEntry = {
      name: input.name ?? nameFromImagePath(actualAbs),
      test,
      status: input.status,
      comparison: {
        diffRatio: input.diffRatio ?? 0,
        threshold: input.threshold ?? 0,
      },
      images: {
        baseline: { path: this.relative(baselineAbs), ...input.baselineSize },
        actual: {
          path: this.existingOrNull(keptActual),
          ...(keptActual && input.actualSize),
        },
        diff: { path: this.existingOrNull(keptDiff) },
      },
      baselineWritten: input.baselineWritten ?? false,
      recordedAt: input.recordedAt ?? now(),
      platform: input.platform,
      target: input.target,
      variant: input.variant,
      viewport: input.viewport,
      options: input.options,
      renderer: input.renderer ?? nativeRenderer(input.platform),
      hashes: hashesOf({
        baseline: baselineAbs,
        actual: keptActual,
        diff: keptDiff,
      }),
      message: input.message ?? '',
    };
    this.byActualPath.set(actualAbs, entry);
    return entry;
  }

  /** Marks a screenshot as approved: the `.actual` image became the baseline, the diff is gone. */
  approve(input: ManifestApproveInput): ManifestEntry {
    const actualAbs = resolveInProject(this.projectRoot, input.actualPath);
    const baselineAbs = input.baselinePath
      ? resolveInProject(this.projectRoot, input.baselinePath)
      : baselineSiblingOf(actualAbs);
    const existing = this.byActualPath.get(actualAbs);
    const entry: ManifestEntry = {
      name: existing?.name ?? nameFromImagePath(actualAbs),
      test: existing?.test ?? {
        file: this.testFile(input.testFile),
        titlePath: [],
        retry: 0,
      },
      status: 'approved',
      comparison: existing?.comparison ?? { diffRatio: 0, threshold: 0 },
      images: {
        baseline: {
          ...existing?.images.baseline,
          path: this.relative(baselineAbs),
        },
        actual: { ...existing?.images.actual, path: null },
        diff: { path: null },
      },
      baselineWritten: true,
      recordedAt: now(),
      platform: existing?.platform,
      target: existing?.target,
      variant: existing?.variant,
      viewport: existing?.viewport,
      options: existing?.options,
      renderer: existing?.renderer,
      // the approved `.actual` is the baseline now, so only that file exists
      hashes: hashesOf({
        baseline: baselineAbs,
        actual: actualAbs,
        diff: null,
      }),
      message:
        input.message ??
        'Baseline image was replaced with the approved screenshot.',
    };
    this.byActualPath.set(actualAbs, entry);
    return entry;
  }

  /**
   * Drops the entries of one test file, e.g. when the file is about to re-run
   * in an interactive runner that restarts its screenshot counters. Returns
   * whether anything was dropped.
   */
  dropTestFile(file: string): boolean {
    const wanted = this.testFile(file);
    let changed = false;
    for (const [key, entry] of this.byActualPath) {
      if (entry.test.file === wanted) {
        this.byActualPath.delete(key);
        changed = true;
      }
    }
    return changed;
  }

  /** Forgets every entry; the header stays. */
  clear() {
    this.byActualPath.clear();
  }

  /** Entries in the order they are written. */
  entries(): ManifestEntry[] {
    return [...this.byActualPath.values()].sort(compareEntries);
  }

  /** The manifest as it would be written now. */
  toJSON(): Manifest {
    return {
      version: MANIFEST_VERSION,
      createdAt: this.header.createdAt,
      updatedAt: now(),
      projectRoot: this.header.projectRoot,
      platform: this.header.platform,
      ci: this.header.ci,
      options: this.header.options,
      runner: this.header.runner,
      ...(this.header.upload && { upload: this.header.upload }),
      entries: this.entries(),
    };
  }
}
