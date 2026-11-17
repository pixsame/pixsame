import fs from 'node:fs';
import path from 'node:path';
import { OLD_BASELINES_NOTICE } from '@pixsame/analysis';

/**
 * Tells once per run (per project: workers share its output folder, which
 * Playwright clears at the start of a run) that a baseline had no page layout.
 * Returns the notice when this call is the one to show it, otherwise `undefined`.
 */
export const oldBaselinesNotice = (
  outputDir: string,
): string | undefined => {
  try {
    fs.mkdirSync(outputDir, { recursive: true });
    // `wx` fails when another worker already wrote it
    fs.writeFileSync(path.join(outputDir, '.pixsame-old-baselines'), '', {
      flag: 'wx',
    });
    return OLD_BASELINES_NOTICE;
  } catch {
    return undefined;
  }
};
