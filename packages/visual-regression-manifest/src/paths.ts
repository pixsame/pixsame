import path from 'path';
import type { Manifest } from './types';

/** `/`-separated form of a path; a no-op on POSIX. */
export const toPosix = (p: string, sep: string = path.sep) =>
  sep === '/' ? p : p.split(sep).join('/');

/** Resolves `p` against `projectRoot` and returns the normalized absolute path. */
export const resolveInProject = (projectRoot: string, p: string) =>
  path.normalize(path.resolve(projectRoot, p));

/** The manifest form of an absolute path: relative to `projectRoot`, `/` separators (may start with `../`). */
export const toProjectRelative = (projectRoot: string, absolute: string) =>
  toPosix(path.relative(projectRoot, absolute));

/** POSIX, relative, no `..`, `.` or empty segments, no drive letters, backslashes or NUL. */
export const isSafeRelativePath = (p: string) => {
  if (!p || p.includes('\u0000') || p.includes('\\')) return false;
  if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return false;
  return p.split('/').every((seg) => seg !== '' && seg !== '.' && seg !== '..');
};

const stripSlashes = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');

/**
 * Directory of the project inside the repository (`''` for the root), derived
 * from `ci.workspace` when the manifest has it, else from `hint`. `null` when
 * the project root lies outside the workspace.
 */
export const projectDirInRepo = (
  manifest: Pick<Manifest, 'projectRoot' | 'ci'>,
  hint = '',
): string | null => {
  const workspace = manifest.ci?.workspace;
  if (!workspace) return stripSlashes(hint).replace(/^\.?\/+/, '');
  const rel = path.posix.relative(
    stripSlashes(workspace),
    stripSlashes(manifest.projectRoot),
  );
  if (rel === '') return '';
  if (rel === '..' || rel.startsWith('../') || path.posix.isAbsolute(rel)) {
    return null;
  }
  return rel;
};

/** Turns a project-relative manifest path into a repository-relative one, or `null` when it escapes the repository. */
export const toRepoPath = (
  projectDir: string | null,
  p: string | null,
): string | null => {
  if (p === null || projectDir === null) return null;
  // manifest paths are project-relative; an absolute one must not be re-rooted
  if (path.posix.isAbsolute(p) || /^[a-zA-Z]:/.test(p)) return null;
  const joined = path.posix.normalize(projectDir ? `${projectDir}/${p}` : p);
  return isSafeRelativePath(joined) ? joined : null;
};
