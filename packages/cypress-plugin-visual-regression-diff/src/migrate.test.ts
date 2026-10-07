import { it, expect, describe, beforeEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  main,
  planMigration,
  detectPackageManager,
  OLD_PACKAGE_NAME as OLD,
  NEW_PACKAGE_NAME as NEW,
  NEW_PACKAGE_RANGE,
  type Io,
} from './migrate';

let cwd: string;
const write = (file: string, content: string) => {
  const target = path.join(cwd, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const read = (file: string) => fs.readFileSync(path.join(cwd, file), 'utf8');

const findEdit = (suffix: string) => {
  const edit = planMigration(cwd).find((e) => e.file.endsWith(suffix));
  if (!edit) throw new Error(`no edit planned for ${suffix}`);
  return edit;
};

const createIo = (overrides: Partial<Io> = {}) => {
  const out: string[] = [];
  const err: string[] = [];
  const io: Io = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    isInteractive: false,
    confirm: vi.fn().mockResolvedValue(true),
    install: vi.fn().mockReturnValue(0),
    ...overrides,
  };
  return { io, out, err };
};

beforeEach(() => {
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cpvrd-migrate-'));
  write(
    'package.json',
    JSON.stringify(
      {
        name: 'app',
        devDependencies: { zod: '^3.0.0', [OLD]: '^4.2.1', cypress: '^15.0.0' },
      },
      null,
      '\t',
    ) + '\n',
  );
  write('cypress.config.ts', `import { initPlugin } from '${OLD}/plugins';\n`);
  write('cypress/support/e2e.ts', `import '${OLD}';\n`);
  write('tsconfig.json', `{ "compilerOptions": { "types": ["${OLD}"] } }\n`);
});

describe('planMigration', () => {
  it('renames the dependency, sorts the keys and keeps the indent', () => {
    const pkgEdit = findEdit('package.json');
    const pkg = JSON.parse(pkgEdit.content);

    expect(Object.keys(pkg.devDependencies)).toEqual([
      '@pixsame/cypress-plugin-visual-regression-diff',
      'cypress',
      'zod',
    ]);
    expect(pkg.devDependencies[NEW]).toBe(NEW_PACKAGE_RANGE);
    expect(pkgEdit.content).toMatch(/^\{\n\t"name"/);
    expect(pkgEdit.content.endsWith('}\n')).toBe(true);
  });

  it('rewrites imports, subpaths and type references in source files', () => {
    const edits = planMigration(cwd);

    expect(edits.map((e) => path.relative(cwd, e.file)).sort()).toEqual([
      'cypress.config.ts',
      'cypress/support/e2e.ts',
      'package.json',
      'tsconfig.json',
    ]);
    expect(findEdit('config.ts').content).toBe(
      `import { initPlugin } from '${NEW}/plugins';\n`,
    );
  });

  it('does not write anything', () => {
    planMigration(cwd);
    expect(read('cypress/support/e2e.ts')).toContain(OLD);
  });

  it('leaves similarly named packages, node_modules and other files alone', () => {
    write('a.ts', `import '${OLD}-extra';\n`);
    write('node_modules/dep/index.js', `require('${OLD}');\n`);
    write('README.md', `npm i ${OLD}\n`);

    const files = planMigration(cwd).map((e) => path.relative(cwd, e.file));

    expect(files).not.toContain('a.ts');
    expect(files.some((f) => f.startsWith('node_modules'))).toBe(false);
    expect(files).not.toContain('README.md');
  });

  it('migrates every dependency field and nested package.json files', () => {
    write(
      'packages/b/package.json',
      JSON.stringify({
        dependencies: { [OLD]: '4.0.0' },
        peerDependencies: { [OLD]: '>=4' },
      }),
    );

    const edit = findEdit(path.join('packages', 'b', 'package.json'));

    expect(JSON.parse(edit.content)).toEqual({
      dependencies: { [NEW]: NEW_PACKAGE_RANGE },
      peerDependencies: { [NEW]: NEW_PACKAGE_RANGE },
    });
    expect(edit.content.endsWith('\n')).toBe(false);
  });

  it('keeps an existing new-name entry instead of overwriting it', () => {
    write(
      'package.json',
      JSON.stringify({ devDependencies: { [OLD]: '^4', [NEW]: '^1.2.0' } }),
    );

    const edit = findEdit('package.json');

    expect(JSON.parse(edit.content).devDependencies).toEqual({
      [NEW]: '^1.2.0',
    });
  });

  it('skips a package.json that only mentions the name outside dependencies or is invalid', () => {
    write('package.json', JSON.stringify({ description: `uses ${OLD}` }));
    write('packages/c/package.json', `{ "dependencies": ${OLD}`);

    const files = planMigration(cwd).map((e) => path.relative(cwd, e.file));

    expect(files).not.toContain('package.json');
    expect(files).not.toContain(path.join('packages', 'c', 'package.json'));
  });
});

describe('detectPackageManager', () => {
  it.each([
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['package-lock.json', 'npm'],
  ])('maps %s to %s', async (lockfile, pm) => {
    write(lockfile, '');
    expect(await detectPackageManager(cwd)).toBe(pm);
  });

  it('prefers the packageManager field of package.json', async () => {
    write('package.json', JSON.stringify({ packageManager: 'pnpm@9.0.0' }));
    write('package-lock.json', '');
    expect(await detectPackageManager(cwd)).toBe('pnpm');
  });

  it('looks in parent directories and falls back to npm', async () => {
    write('yarn.lock', '');
    write('apps/web/.keep', '');
    expect(await detectPackageManager(path.join(cwd, 'apps', 'web'))).toBe(
      'yarn',
    );

    const lonely = fs.mkdtempSync(path.join(os.tmpdir(), 'cpvrd-lonely-'));
    expect(await detectPackageManager(lonely)).toBe('npm');
  });
});

describe('main', () => {
  it('prints help without a command and for --help', async () => {
    for (const argv of [[], ['--help'], ['migrate', '-h']]) {
      const { io, out } = createIo();
      expect(await main(argv, io)).toBe(0);
      expect(out.join('\n')).toContain('Usage:');
    }
  });

  it('fails on an unknown command', async () => {
    const { io, err } = createIo();
    expect(await main(['nope'], io)).toBe(1);
    expect(err.join('\n')).toContain('Unknown command: nope');
  });

  it('fails when --cwd is not a directory', async () => {
    const { io, err } = createIo();
    expect(
      await main(['migrate', '--cwd', path.join(cwd, 'missing')], io),
    ).toBe(1);
    expect(err.join('\n')).toContain('Not a directory');
  });

  it('has nothing to do in an unrelated project', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'cpvrd-empty-'));
    const { io, out } = createIo();
    expect(await main(['migrate', '--cwd', empty], io)).toBe(0);
    expect(out.join('\n')).toContain('Nothing to migrate');
  });

  it('lists the files and writes nothing on --dry-run', async () => {
    const { io, out } = createIo();

    expect(await main(['migrate', '--dry-run', '--cwd', cwd], io)).toBe(0);

    expect(out.join('\n')).toContain('Migration tool: ');
    expect(out.join('\n')).toContain(`Found usages of ${OLD} in these files`);
    expect(out.join('\n')).toContain('• cypress.config.ts (1)');
    expect(read('cypress.config.ts')).toContain(OLD);
    expect(io.install).not.toHaveBeenCalled();
  });

  it('refuses to write without a terminal unless --yes is given', async () => {
    const { io, err } = createIo({ isInteractive: false });

    expect(await main(['migrate', '--cwd', cwd], io)).toBe(1);

    expect(err.join('\n')).toContain('--yes');
    expect(read('cypress.config.ts')).toContain(OLD);
  });

  it('asks in a terminal and aborts on "no"', async () => {
    const { io } = createIo({
      isInteractive: true,
      confirm: vi.fn().mockResolvedValue(false),
    });

    expect(await main(['migrate', '--cwd', cwd], io)).toBe(1);

    expect(io.confirm).toHaveBeenCalledOnce();
    expect(read('cypress.config.ts')).toContain(OLD);
  });

  it('applies the changes after a "yes" and reinstalls with the detected package manager', async () => {
    write('pnpm-lock.yaml', '');
    const { io } = createIo({ isInteractive: true });

    expect(await main(['migrate', '--cwd', cwd], io)).toBe(0);

    expect(read('cypress.config.ts')).toContain(NEW);
    expect(read('cypress/support/e2e.ts')).not.toContain(OLD);
    expect(io.install).toHaveBeenCalledWith('pnpm', cwd);
  });

  it('applies with --yes and skips the install on --no-install', async () => {
    const { io } = createIo();

    expect(
      await main(['migrate', '--yes', '--no-install', '--cwd', cwd], io),
    ).toBe(0);

    expect(io.confirm).not.toHaveBeenCalled();
    expect(io.install).not.toHaveBeenCalled();
    expect(read('tsconfig.json')).toContain(NEW);
  });

  it('is idempotent', async () => {
    await main(
      ['migrate', '--yes', '--no-install', '--cwd', cwd],
      createIo().io,
    );
    const { io, out } = createIo();

    expect(await main(['migrate', '--yes', '--cwd', cwd], io)).toBe(0);

    expect(out.join('\n')).toContain('Nothing to migrate');
  });

  it('reports a failing install but keeps the edits', async () => {
    const { io, err } = createIo({ install: vi.fn().mockReturnValue(2) });

    expect(await main(['migrate', '--yes', '--cwd', cwd], io)).toBe(1);

    expect(err.join('\n')).toContain('npm install` failed (exit 2)');
    expect(read('cypress.config.ts')).toContain(NEW);
  });
});
