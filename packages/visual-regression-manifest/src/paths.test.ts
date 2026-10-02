import { describe, expect, it } from 'vitest';
import { manifest } from '../__tests__/helpers';
import {
  isSafeRelativePath,
  projectDirInRepo,
  resolveInProject,
  toPosix,
  toProjectRelative,
  toRepoPath,
} from './paths';

describe('path edge cases', () => {
  it('only treats a real parent traversal as leaving the checkout', () => {
    const at = (projectRoot: string) =>
      projectDirInRepo({
        projectRoot,
        ci: { provider: null, workspace: '/w' },
      });
    expect(at('/w/..foo')).toBe('..foo');
    expect(at('/w/app')).toBe('app');
    expect(at('/x')).toBeNull();
    expect(at('/')).toBeNull();
  });

  it('does not re-root absolute paths under the project directory', () => {
    expect(toRepoPath('app', '/etc/x.png')).toBeNull();
    expect(toRepoPath('app', 'C:/x.png')).toBeNull();
    expect(toRepoPath('app', 'a/b.png')).toBe('app/a/b.png');
  });
});

describe('paths', () => {
  it('toPosix replaces the given separator only', () => {
    expect(toPosix('a\\b\\c', '\\')).toBe('a/b/c');
    expect(toPosix('a\\b', '/')).toBe('a\\b');
    expect(toPosix('a/b')).toBe('a/b');
  });

  it('resolves and relativizes against the project root', () => {
    expect(resolveInProject('/p', 'a/../b.png')).toBe('/p/b.png');
    expect(resolveInProject('/p', '/x/b.png')).toBe('/x/b.png');
    expect(toProjectRelative('/p', '/p/a/b.png')).toBe('a/b.png');
    expect(toProjectRelative('/p', '/x/b.png')).toBe('../x/b.png');
  });

  it('isSafeRelativePath', () => {
    expect(isSafeRelativePath('a/b.png')).toBe(true);
    expect(isSafeRelativePath('a/../b.png')).toBe(false);
    expect(isSafeRelativePath('/a.png')).toBe(false);
    expect(isSafeRelativePath('C:/a.png')).toBe(false);
    expect(isSafeRelativePath('a\\b.png')).toBe(false);
    expect(isSafeRelativePath('a//b.png')).toBe(false);
    expect(isSafeRelativePath('./a.png')).toBe(false);
    expect(isSafeRelativePath('')).toBe(false);
    expect(isSafeRelativePath('a\u0000.png')).toBe(false);
  });

  it('projectDirInRepo uses ci.workspace when present, else the hint', () => {
    expect(projectDirInRepo(manifest())).toBe('');
    expect(
      projectDirInRepo(
        manifest([], { projectRoot: '/home/runner/work/r/r/examples/next/' }),
      ),
    ).toBe('examples/next');
    expect(
      projectDirInRepo({
        projectRoot: 'D:\\a\\r\\r\\apps\\web',
        ci: { provider: 'github', workspace: 'D:\\a\\r\\r' },
      }),
    ).toBe('apps/web');
    expect(
      projectDirInRepo(manifest([], { projectRoot: '/elsewhere' })),
    ).toBeNull();
    expect(
      projectDirInRepo({ projectRoot: '/x', ci: null }, './examples/next/'),
    ).toBe('examples/next');
    expect(projectDirInRepo({ projectRoot: '/x', ci: null })).toBe('');
  });

  it('toRepoPath joins and refuses escapes', () => {
    expect(toRepoPath('', 'a/b.png')).toBe('a/b.png');
    expect(toRepoPath('examples/next', 'a/b.png')).toBe(
      'examples/next/a/b.png',
    );
    // an absolute imagesPath one level up still lands inside the repository
    expect(toRepoPath('examples/next', '../shared/b.png')).toBe(
      'examples/shared/b.png',
    );
    expect(toRepoPath('', '../b.png')).toBeNull();
    expect(toRepoPath('', null)).toBeNull();
    expect(toRepoPath(null, 'a.png')).toBeNull();
  });
});
