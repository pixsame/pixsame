import { createHash } from 'crypto';
import { MANIFEST_STATUSES, needsHuman } from './constants';
import { projectDirInRepo, toRepoPath } from './paths';
import type { Manifest, ManifestEntry, ManifestStatus } from './types';

export type ManifestSource = {
  manifest: Manifest;
  /** Where the manifest came from (file path, artifact entry), for warnings. */
  label?: string;
};

export type RepoPaths = {
  baseline: string | null;
  actual: string | null;
  diff: string | null;
};

export type MergedEntry<S extends ManifestSource = ManifestSource> = {
  /** What identifies a baseline across manifests: name, test file, platform, renderer. */
  key: string;
  /** Short, URL-safe form of `key`. */
  keyHash: string;
  entry: ManifestEntry;
  source: S;
  runAttempt: number;
  /** Repository-relative POSIX paths, `null` when unknown or unsafe. */
  repoPaths: RepoPaths;
  /** Set when this entry can never be approved from CI (bad path, no `.actual` image). */
  unapprovableReason?: string;
  /** Other entries (key hashes) that write the same baseline path. */
  collidesWith: string[];
};

export type MergedRun<S extends ManifestSource = ManifestSource> = {
  entries: MergedEntry<S>[];
  sources: S[];
  warnings: string[];
  counts: Record<ManifestStatus, number>;
  needsHuman: MergedEntry<S>[];
};

export type MergeOptions = {
  /** Commit the merged run is for; manifests written for another commit produce a warning. */
  headSha?: string;
  /** CI run id the merged run is for; manifests of another run produce a warning. */
  runId?: string | number;
  /** `owner/repo` the merged run is for. */
  repository?: string;
  /** Directory of the project inside the repository, for manifests without `ci.workspace`. */
  projectRootHint?: string;
};

/**
 * `platform` is where the test ran; `renderer` is where the pixels came from.
 * A native renderer is the test browser itself and adds nothing; any other
 * renderer (a pinned Docker image, a hosted renderer) is part of the identity
 * of a baseline, so one capture rendered in several browsers stays apart.
 */
export const rendererLabel = (entry: ManifestEntry) => {
  const renderer = entry.renderer;
  if (!renderer || renderer.backend === 'native') return '';
  return [renderer.backend, renderer.name ?? renderer.browser]
    .filter(Boolean)
    .join(' ');
};

export const entryKey = (entry: ManifestEntry) =>
  [
    entry.name,
    entry.test.file,
    entry.platform?.os ?? '',
    entry.platform?.browser?.name ?? '',
    rendererLabel(entry),
    entry.variant ?? '',
  ].join('\u0000');

export const keyHash = (key: string) =>
  createHash('sha1').update(key).digest('hex').slice(0, 12);

/** `linux / chrome`, `linux / chrome (docker chromium)`, or `''` when the entry has no platform. */
export const platformLabel = (entry: ManifestEntry) => {
  const os = entry.platform?.os;
  const browser = entry.platform?.browser?.name;
  const platform = [os, browser, entry.variant].filter(Boolean).join(' / ');
  const renderer = rendererLabel(entry);
  if (!renderer) return platform;
  return platform ? `${platform} (${renderer})` : renderer;
};

export const countByStatus = (
  entries: readonly ManifestEntry[],
): Record<ManifestStatus, number> => {
  const counts = Object.fromEntries(
    MANIFEST_STATUSES.map((status) => [status, 0]),
  ) as Record<ManifestStatus, number>;
  for (const entry of entries) counts[entry.status] += 1;
  return counts;
};

const compareMerged = (a: MergedEntry, b: MergedEntry) =>
  a.entry.test.file.localeCompare(b.entry.test.file) ||
  a.entry.name.localeCompare(b.entry.name) ||
  platformLabel(a.entry).localeCompare(platformLabel(b.entry));

/**
 * Concatenates the entries of every manifest of a run (several machines,
 * e2e + component, one file per worker, re-run attempts) into one list keyed
 * by screenshot name, test file, platform and renderer. A later CI attempt
 * wins over an earlier one; within one attempt the later source wins.
 */
export const mergeManifests = <S extends ManifestSource>(
  sources: S[],
  opts: MergeOptions = {},
): MergedRun<S> => {
  const warnings: string[] = [];
  const byKey = new Map<string, MergedEntry<S>>();

  sources.forEach((source, index) => {
    const { manifest } = source;
    const where = source.label ?? `manifest #${index + 1}`;
    const ci = manifest.ci;
    if (ci) {
      if (
        opts.headSha &&
        ci.pullRequest?.headSha &&
        ci.pullRequest.headSha !== opts.headSha
      ) {
        warnings.push(
          `${where}: manifest was written for commit ${ci.pullRequest.headSha.slice(0, 7)}, the run is for ${opts.headSha.slice(0, 7)}`,
        );
      }
      if (
        opts.runId !== undefined &&
        ci.runId &&
        String(ci.runId) !== String(opts.runId)
      ) {
        warnings.push(
          `${where}: manifest belongs to run ${ci.runId}, not ${opts.runId}`,
        );
      }
      if (
        opts.repository &&
        ci.repository &&
        ci.repository !== opts.repository
      ) {
        warnings.push(
          `${where}: manifest belongs to ${ci.repository}, not ${opts.repository}`,
        );
      }
    }
    const projectDir = projectDirInRepo(manifest, opts.projectRootHint);
    if (projectDir === null) {
      warnings.push(
        `${where}: project root ${manifest.projectRoot} is outside the checkout ${manifest.ci?.workspace}; its screenshots cannot be approved from CI`,
      );
    }
    const runAttempt = Number.parseInt(String(ci?.runAttempt ?? '1'), 10) || 1;

    // an `auto` renderer degraded to the local browser: those pixels did not
    // come from the pinned renderer the baselines were made with
    const fallbacks = manifest.entries.filter((e) => e.renderer?.fallback);
    if (fallbacks.length > 0) {
      warnings.push(
        `${where}: ${fallbacks.length} screenshot${fallbacks.length === 1 ? ' was' : 's were'} rendered by the local browser because the configured renderer was unavailable (\`renderer.fallback\`); expect drift against baselines made with the renderer`,
      );
    }

    for (const entry of manifest.entries) {
      const key = entryKey(entry);
      const repoPaths: RepoPaths = {
        baseline: toRepoPath(projectDir, entry.images.baseline.path),
        actual: toRepoPath(projectDir, entry.images.actual.path),
        diff: toRepoPath(projectDir, entry.images.diff.path),
      };
      let unapprovableReason: string | undefined;
      if (needsHuman(entry.status)) {
        if (!repoPaths.baseline) {
          unapprovableReason = `baseline path \`${entry.images.baseline.path}\` is outside the repository`;
        } else if (!entry.images.actual.path) {
          unapprovableReason = 'the run kept no actual image for it';
        } else if (!repoPaths.actual) {
          unapprovableReason = `actual path \`${entry.images.actual.path}\` is outside the repository`;
        }
      }
      const merged: MergedEntry<S> = {
        key,
        keyHash: keyHash(key),
        entry,
        source,
        runAttempt,
        repoPaths,
        unapprovableReason,
        collidesWith: [],
      };
      const existing = byKey.get(key);
      if (!existing || existing.runAttempt <= runAttempt)
        byKey.set(key, merged);
    }
  });

  const entries = [...byKey.values()].sort(compareMerged);
  const counts = countByStatus(entries.map((e) => e.entry));
  const humans = entries.filter((e) => needsHuman(e.entry.status));

  // two platforms writing the same baseline file cannot both be approved
  const byBaseline = new Map<string, MergedEntry<S>[]>();
  for (const e of humans) {
    if (!e.repoPaths.baseline) continue;
    const list = byBaseline.get(e.repoPaths.baseline) ?? [];
    list.push(e);
    byBaseline.set(e.repoPaths.baseline, list);
  }
  for (const list of byBaseline.values()) {
    if (list.length < 2) continue;
    for (const e of list) {
      e.collidesWith = list.filter((o) => o !== e).map((o) => o.keyHash);
    }
  }

  return { entries, sources, warnings, counts, needsHuman: humans };
};

export type EntrySelection =
  'all' | { keyHashes: string[] } | { names: string[] };

/**
 * Entries chosen for an action: every entry that needs a human (`'all'`), by
 * key hash (a button per entry), or by name as shown to people (`name` or
 * `name (platform label)`).
 */
export const selectEntries = <S extends ManifestSource>(
  run: MergedRun<S>,
  selection: EntrySelection,
): { entries: MergedEntry<S>[]; unknown: string[] } => {
  if (selection === 'all') return { entries: run.needsHuman, unknown: [] };
  if ('keyHashes' in selection) {
    const wanted = new Set(selection.keyHashes);
    const entries = run.entries.filter((e) => wanted.has(e.keyHash));
    const found = new Set(entries.map((e) => e.keyHash));
    return {
      entries,
      unknown: selection.keyHashes.filter((h) => !found.has(h)),
    };
  }
  const entries: MergedEntry<S>[] = [];
  const unknown: string[] = [];
  for (const name of selection.names) {
    const matches = run.entries.filter(
      (e) =>
        e.entry.name === name ||
        `${e.entry.name} (${platformLabel(e.entry)})` === name,
    );
    if (matches.length === 0) unknown.push(name);
    entries.push(...matches);
  }
  return { entries: [...new Set(entries)], unknown };
};
