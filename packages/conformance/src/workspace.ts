import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifestFile } from 'visual-regression-manifest';
import type { Observed, Workspace } from './types.js';

export const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

// inside the package (git-ignored) so node resolution finds the workspace
// dependencies from the generated projects
const TMP_ROOT = path.join(PACKAGE_ROOT, '.tmp');

/** Directories where a runner keeps its own temporary copies. */
const SKIPPED_DIRS = new Set(['node_modules', 'screenshots', 'test-results']);

export const SHOT_TITLE = 'shot';

const walk = (dir: string, visit: (file: string) => void) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) walk(full, visit);
    } else {
      visit(full);
    }
  }
};

export const createWorkspace = (name: string, baseUrl: string): Workspace => {
  fs.mkdirSync(TMP_ROOT, { recursive: true });
  const dir = fs.mkdtempSync(path.join(TMP_ROOT, `${name}-`));
  return { dir, baseUrl, baseline: () => observeFiles(dir).baseline };
};

export const observeFiles = (dir: string): Observed['files'] => {
  const files: Observed['files'] = {};
  walk(dir, (file) => {
    const base = path.basename(file);
    if (base === `${SHOT_TITLE}_#0.png`) files.baseline = file;
    else if (base === `${SHOT_TITLE}_#0.actual.png`) files.actual = file;
    else if (base === `${SHOT_TITLE}_#0.diff.png`) files.diff = file;
  });
  return files;
};

const manifestFiles = (dir: string) => {
  const found: string[] = [];
  const scan = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') scan(full);
      } else if (/^visual-regression-manifest.*\.json$/.test(entry.name)) {
        found.push(full);
      }
    }
  };
  scan(dir);
  return found;
};

/** Manifests are per run, so the next run starts from none. */
export const clearManifests = (dir: string) => {
  for (const file of manifestFiles(dir)) fs.rmSync(file);
};

export const readEntries = (dir: string) =>
  manifestFiles(dir).flatMap((file) => readManifestFile(file).entries);

export const removeWorkspace = (ws: Workspace) =>
  fs.rmSync(ws.dir, { recursive: true, force: true });
