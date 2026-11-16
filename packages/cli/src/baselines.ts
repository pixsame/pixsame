import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ANALYSIS_VERSION, layoutVersionOf } from '@pixsame/analysis';

/**
 * - `current`: has the page layout of this analysis version.
 * - `outdated`: has a layout from another analysis version; it is ignored until the baseline is replaced.
 * - `missing`: a baseline stored before layouts were recorded.
 */
export type Status = 'current' | 'outdated' | 'missing';

export type Baseline = { file: string; status: Status; version?: number };

export type Report = {
  analysisVersion: number;
  baselines: Baseline[];
  counts: Record<Status, number>;
};

/** Marks images written by the plugins (Cypress and Playwright adapters alike). */
const IMAGE_MARKER = Buffer.from('FRSOURCE_CPVRD_V');
/** Folders the runners keep baselines in, for baselines that carry no mark. */
const BASELINE_DIR =
  /(^|[\\/])(__screenshots__|snapshots|[^\\/]*-snapshots)([\\/]|$)/;
const SKIPPED_DIR = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
]);
/** What the plugins write next to a baseline when a comparison fails. */
const NOT_A_BASELINE = /\.(actual|diff)\.png$/i;

const pngsIn = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory())
        return SKIPPED_DIR.has(entry.name) ? [] : pngsIn(full);
      return entry.isFile() &&
        /\.png$/i.test(entry.name) &&
        !NOT_A_BASELINE.test(entry.name)
        ? [full]
        : [];
    }),
  );
  return nested.flat();
};

/**
 * Every baseline below `roots` and whether it carries the page layout of the
 * current analysis version. A PNG counts as a baseline when it has a layout
 * of any version, was written by the plugins, or sits in a snapshots folder.
 */
export const findBaselines = async (
  roots: string[],
  cwd = process.cwd(),
): Promise<Report> => {
  const files = (
    await Promise.all(roots.map((root) => pngsIn(path.resolve(cwd, root))))
  ).flat();
  const baselines: Baseline[] = [];
  for (const file of [...new Set(files)].sort()) {
    const bytes = await readFile(file);
    const version = layoutVersionOf(bytes);
    const isBaseline =
      version !== undefined ||
      bytes.includes(IMAGE_MARKER) ||
      BASELINE_DIR.test(path.relative(cwd, file));
    if (!isBaseline) continue;
    baselines.push({
      file: path.relative(cwd, file),
      status:
        version === undefined
          ? 'missing'
          : version === ANALYSIS_VERSION
            ? 'current'
            : 'outdated',
      ...(version !== undefined && { version }),
    });
  }
  const counts = { current: 0, outdated: 0, missing: 0 };
  for (const { status } of baselines) counts[status]++;
  return { analysisVersion: ANALYSIS_VERSION, baselines, counts };
};
