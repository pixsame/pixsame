import type { Analysis, Label } from './types';

/** The part of a manifest entry `bundle` reads. */
export type BundleEntry = {
  name: string;
  extra?: Record<string, Record<string, unknown> | undefined>;
};

export type Bundle = {
  key: string;
  label: Label;
  /** The description of the first entry; the others changed in the same way. */
  description: string;
  /** Entry names, in the order given. */
  entries: string[];
};

/** The analysis recorded on a manifest entry, if any. */
export const analysisOf = (entry: BundleEntry): Analysis | undefined => {
  const analysis = entry.extra?.pixsame?.analysis as Analysis | undefined;
  return analysis?.version === 1 ? analysis : undefined;
};

/**
 * Groups entries that changed in the same way (the same area with the same
 * new pixels, the same move, the same size change), so a change that shows
 * in 14 screenshots is one thing to decide. Largest group first. Entries
 * without an analysis are left out.
 */
export const bundle = (entries: BundleEntry[]): Bundle[] => {
  const bundles = new Map<string, Bundle>();
  for (const entry of entries) {
    const analysis = analysisOf(entry);
    if (!analysis) continue;
    const existing = bundles.get(analysis.bundleKey);
    if (existing) existing.entries.push(entry.name);
    else {
      bundles.set(analysis.bundleKey, {
        key: analysis.bundleKey,
        label: analysis.label,
        description: analysis.description,
        entries: [entry.name],
      });
    }
  }
  return [...bundles.values()].sort(
    (a, b) => b.entries.length - a.entries.length,
  );
};
