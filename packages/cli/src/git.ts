import { execFileSync } from 'node:child_process';

/** The output of a git command run in `cwd`; `undefined` when it fails or this is not a repository. */
export const git = (cwd: string, ...args: string[]): string | undefined => {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return undefined;
  }
};

/** The top directory of the repository `cwd` is in, or `cwd` itself outside one. */
export const projectRoot = (cwd: string) =>
  git(cwd, 'rev-parse', '--show-toplevel') ?? cwd;
