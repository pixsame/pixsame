/**
 * The version of everything this package stores or reports: the layout
 * snapshot taken in the page, its encoding, and the meaning of the analysis
 * (`Analysis.version`).
 *
 * Raise it with any change that makes data written by an older version wrong
 * or unreadable: a different field in the snapshot, a different encoding, a
 * different way of reading the snapshot. A PNG carries it in the keyword of
 * its layout chunk (`pixsame-layout-v4`), so a baseline stamped by an older
 * version is recognised without decoding it and the comparison falls back to
 * pixels only. Re-running the tests with `--update` stamps new baselines.
 */
export const ANALYSIS_VERSION = 4;
