import { spawn } from 'node:child_process';
import type { Observed, Workspace } from '../types.js';
import {
  clearManifests,
  observeFiles,
  PACKAGE_ROOT,
  readEntries,
} from '../workspace.js';

/** Runs a runner CLI through pnpm and reads what it left in the workspace. */
// async on purpose: the fixture server lives in this process and has to keep
// answering while the runner loads its pages
export const runAndObserve = async (
  ws: Workspace,
  args: string[],
  env: Record<string, string>,
  platformToken: string,
): Promise<Observed> => {
  clearManifests(ws.dir);
  const { code, output } = await new Promise<{ code: number; output: string }>(
    (resolve) => {
      const child = spawn('pnpm', ['exec', ...args], {
        cwd: PACKAGE_ROOT,
        env: { ...process.env, ...env, FORCE_COLOR: '0', NO_COLOR: '1' },
      });
      let out = '';
      child.stdout.on('data', (chunk) => (out += chunk));
      child.stderr.on('data', (chunk) => (out += chunk));
      const timer = setTimeout(() => child.kill('SIGKILL'), 110_000);
      child.on('close', (status) => {
        clearTimeout(timer);
        resolve({ code: status ?? 1, output: out });
      });
    },
  );
  return {
    exitCode: code,
    output,
    entries: readEntries(ws.dir),
    files: observeFiles(ws.dir),
    platformToken,
  };
};
