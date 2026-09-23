import { createHash } from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectCi, type EnvLike } from './ci.utils';
import { FILE_SUFFIX, MANIFEST_VERSION } from './constants';
import { toPosix } from './fs.utils';
import type { ImageInfo } from './image.utils';
import type {
  Manifest,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestHashes,
  ManifestRenderer,
  ManifestRunner,
  ManifestStatus,
} from './manifest.types';

export type ManifestRunInput = {
  /** Playwright's `config.rootDir`; every path in the manifest is relative to it. */
  projectRoot: string;
  runner: ManifestRunner;
  /** Global plugin options as configured in `use`. */
  options: Record<string, unknown>;
  env?: EnvLike;
};

export type ManifestRecordInput = {
  actualPath: string;
  baselinePath: string;
  /** Test file path, absolute or relative to `projectRoot`. */
  testFile: string;
  titlePath: string[];
  retry: number;
  status: ManifestStatus;
  diffRatio: number;
  threshold: number;
  baselineWritten: boolean;
  imgNewSize?: ImageInfo;
  imgOldSize?: ImageInfo;
  message: string;
  platform?: ManifestEntry['platform'];
  viewport?: ManifestEntry['viewport'];
  options?: ManifestEntryOptions;
  renderer?: ManifestRenderer;
};

const now = () => new Date().toISOString();

const sha256 = (file: string) =>
  createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const nameFromActualPath = (actualPath: string) => {
  const stem = path.basename(actualPath, path.extname(actualPath));
  return stem.endsWith(FILE_SUFFIX.actual)
    ? stem.slice(0, -FILE_SUFFIX.actual.length)
    : stem;
};

const sameTitlePath = (a: string[], b: string[]) =>
  a.length === b.length && a.every((part, i) => part === b[i]);

const compareEntries = (a: ManifestEntry, b: ManifestEntry) =>
  a.test.file.localeCompare(b.test.file) || a.name.localeCompare(b.name);

/**
 * Writes the run manifest of one Playwright worker. The shape is the one the
 * Cypress plugin writes (see `manifest.types.ts`); only `runner` differs.
 * The file is rewritten after every comparison (write, then rename), so it is
 * complete even when the run is killed.
 */
export class ManifestWriter {
  private readonly entries = new Map<string, ManifestEntry>();
  private readonly createdAt = now();
  private readonly run: Omit<Manifest, 'entries' | 'updatedAt'>;

  constructor(
    readonly manifestPath: string,
    input: ManifestRunInput,
  ) {
    this.run = {
      version: MANIFEST_VERSION,
      createdAt: this.createdAt,
      projectRoot: input.projectRoot,
      platform: {
        os: process.platform,
        arch: process.arch,
        osVersion: os.release(),
      },
      ci: detectCi(input.env ?? process.env),
      options: input.options,
      runner: input.runner,
    };
  }

  private relative(absolute: string) {
    return toPosix(path.relative(this.run.projectRoot, absolute));
  }

  private existingOrNull(absolute: string) {
    return fs.existsSync(absolute) ? this.relative(absolute) : null;
  }

  private hashes(files: Record<keyof ManifestHashes, string>) {
    const hashes: ManifestHashes = {};
    for (const key of ['baseline', 'actual', 'diff'] as const) {
      if (fs.existsSync(files[key])) hashes[key] = sha256(files[key]);
    }
    return hashes;
  }

  record(input: ManifestRecordInput): ManifestEntry {
    const actualAbs = path.resolve(this.run.projectRoot, input.actualPath);
    const baselineAbs = path.resolve(this.run.projectRoot, input.baselinePath);
    const diffAbs = actualAbs.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff);
    const test = {
      file: this.relative(path.resolve(this.run.projectRoot, input.testFile)),
      titlePath: input.titlePath,
      retry: input.retry,
    };

    // a retried test regenerates its screenshots, so earlier attempts are stale
    if (test.retry > 0) {
      for (const [key, entry] of this.entries) {
        if (
          entry.test.retry < test.retry &&
          entry.test.file === test.file &&
          sameTitlePath(entry.test.titlePath, test.titlePath)
        ) {
          this.entries.delete(key);
        }
      }
    }

    const entry: ManifestEntry = {
      name: nameFromActualPath(actualAbs),
      test,
      status: input.status,
      comparison: { diffRatio: input.diffRatio, threshold: input.threshold },
      images: {
        baseline: { path: this.relative(baselineAbs), ...input.imgOldSize },
        actual: { path: this.existingOrNull(actualAbs), ...input.imgNewSize },
        diff: {
          path: diffAbs === actualAbs ? null : this.existingOrNull(diffAbs),
        },
      },
      baselineWritten: input.baselineWritten,
      recordedAt: now(),
      platform: input.platform,
      viewport: input.viewport,
      options: input.options,
      renderer: input.renderer,
      hashes: this.hashes({
        baseline: baselineAbs,
        actual: actualAbs,
        diff: diffAbs === actualAbs ? '' : diffAbs,
      }),
      message: input.message,
    };
    this.entries.set(actualAbs, entry);
    this.write();
    return entry;
  }

  getEntries(): ManifestEntry[] {
    return [...this.entries.values()].sort(compareEntries);
  }

  private write() {
    const manifest: Manifest = {
      ...this.run,
      updatedAt: now(),
      entries: this.getEntries(),
    };
    fs.mkdirSync(path.dirname(this.manifestPath), { recursive: true });
    const tmpPath = `${this.manifestPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
    fs.renameSync(tmpPath, this.manifestPath);
  }
}
