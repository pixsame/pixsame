import fs from 'fs';
import path from 'path';
import {
  ManifestBuilder,
  type ManifestApproveInput,
  type ManifestEntryInput,
  type ManifestHeaderInput,
} from './builder';
import type { Manifest, ManifestEntry } from './types';

let tmpCounter = 0;
/** Renaming over a file another process has open fails transiently on Windows. */
const RENAME_RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES']);
const RENAME_ATTEMPTS = 5;

const sleep = (ms: number) =>
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const renameWithRetry = (from: string, to: string) => {
  for (let attempt = 1; ; attempt++) {
    try {
      return fs.renameSync(from, to);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (attempt >= RENAME_ATTEMPTS || !code || !RENAME_RETRYABLE.has(code)) {
        throw error;
      }
      sleep(10 * attempt);
    }
  }
};

/**
 * Writes a manifest atomically (to a uniquely named temporary file next to it,
 * then rename), so a consumer never reads a half-written file and two writers
 * on one path never share a temporary file. Creates the directory when needed.
 */
export const writeManifestFile = (filePath: string, manifest: Manifest) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${tmpCounter++}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(manifest, null, 2));
    renameWithRetry(tmpPath, filePath);
  } catch (error) {
    fs.rmSync(tmpPath, { force: true });
    throw error;
  }
};

/** Temporary files a killed writer left next to `filePath`. */
const removeStaleTmpFiles = (filePath: string) => {
  const dir = path.dirname(filePath);
  const stale = new RegExp(
    `^${path.basename(filePath).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+\\.\\d+\\.tmp$`,
  );
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (stale.test(name)) fs.rmSync(path.join(dir, name), { force: true });
  }
};

/**
 * A `ManifestBuilder` bound to a file: every change rewrites the file, so the
 * manifest on disk is complete even when the run gets killed halfway.
 */
export class ManifestWriter extends ManifestBuilder {
  constructor(
    readonly filePath: string,
    header: ManifestHeaderInput,
  ) {
    super(header);
  }

  override record(input: ManifestEntryInput): ManifestEntry {
    const entry = super.record(input);
    this.write();
    return entry;
  }

  override approve(input: ManifestApproveInput): ManifestEntry {
    const entry = super.approve(input);
    this.write();
    return entry;
  }

  override dropTestFile(file: string): boolean {
    const changed = super.dropTestFile(file);
    if (changed) this.write();
    return changed;
  }

  /** Rewrites the file from the current state. */
  write() {
    writeManifestFile(this.filePath, this.toJSON());
  }

  /** Forgets every entry and removes the file, e.g. at the start of a run. */
  reset() {
    this.clear();
    if (fs.existsSync(this.filePath)) fs.unlinkSync(this.filePath);
    removeStaleTmpFiles(this.filePath);
  }
}
