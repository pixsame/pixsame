import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { run, type Io } from './cli';

let dir: string;
let lines: string[];

const io = (answers?: string[]): Io => ({
  out: (line) => void lines.push(line),
  ask: answers && (async () => answers.shift() ?? ''),
  exec: async () => 0,
  open: () => undefined,
  wait: async () => undefined,
  cwd: dir,
});

const init = async (args: string[] = [], answers?: string[]) => {
  lines = [];
  const code = await run(['init', ...args], io(answers));
  return { code, text: lines.join('\n') };
};

const skill = () =>
  path.join(dir, '.claude', 'skills', 'pixsame-verify', 'SKILL.md');
const settings = () => path.join(dir, '.claude', 'settings.json');
const readSettings = () =>
  JSON.parse(fs.readFileSync(settings(), 'utf8')) as {
    hooks: {
      Stop: { hooks: { type: string; command: string; timeout: number }[] }[];
    };
    [key: string]: unknown;
  };

beforeEach(() => {
  dir = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'pixsame-init-')),
  );
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('init', () => {
  it('shows what it will write, asks once and copies the skills', async () => {
    const { code, text } = await init([], ['']);
    expect(code).toBe(0);
    expect(text).toContain('This will write:');
    expect(text).toContain(
      path.join('.claude', 'skills', 'pixsame-verify', 'SKILL.md'),
    );
    expect(text).toContain('Your agent now has: pixsame-verify');
    expect(fs.readFileSync(skill(), 'utf8')).toContain('name: pixsame-verify');
    expect(fs.existsSync(settings())).toBe(false);
  });

  it('writes nothing when the answer is no', async () => {
    const { code, text } = await init([], ['n']);
    expect(code).toBe(1);
    expect(text).toContain('Nothing written.');
    expect(fs.existsSync(skill())).toBe(false);
  });

  it('needs --yes without a terminal', async () => {
    expect(await init()).toMatchObject({ code: 2 });
    expect(fs.existsSync(skill())).toBe(false);
    expect(await init(['--yes'])).toMatchObject({ code: 0 });
    expect(fs.existsSync(skill())).toBe(true);
  });

  it('has nothing to do the second time, and replaces a skill that differs', async () => {
    await init(['--yes']);
    expect((await init(['--yes'])).text).toContain('Nothing to do');
    fs.writeFileSync(skill(), 'old');
    const { text } = await init(['--yes']);
    expect(text).toContain('(replaces the one there)');
    expect(fs.readFileSync(skill(), 'utf8')).toContain('name: pixsame-verify');
  });

  it('adds the Stop hook next to what the settings already hold', async () => {
    fs.mkdirSync(path.dirname(settings()), { recursive: true });
    fs.writeFileSync(
      settings(),
      JSON.stringify({
        model: 'x',
        hooks: {
          PreToolUse: [{ matcher: 'Bash', hooks: [] }],
          Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }],
        },
      }),
    );
    expect(await init(['--hook', '--yes'])).toMatchObject({ code: 0 });
    const saved = readSettings();
    expect(saved.model).toBe('x');
    expect(saved.hooks).toHaveProperty('PreToolUse');
    expect(saved.hooks.Stop).toHaveLength(2);
    expect(saved.hooks.Stop[1].hooks[0]).toEqual({
      type: 'command',
      command:
        'cd "$CLAUDE_PROJECT_DIR" && npx pixsame snap --check --hook claude',
      timeout: 120,
    });
    // once only
    expect((await init(['--hook', '--yes'])).text).toContain('Nothing to do');
    expect(readSettings().hooks.Stop).toHaveLength(2);
  });

  it('leaves settings it cannot read alone', async () => {
    fs.mkdirSync(path.dirname(settings()), { recursive: true });
    fs.writeFileSync(settings(), '{ nope');
    const { code, text } = await init(['--hook', '--yes']);
    expect(code).toBe(2);
    expect(text).toContain('is not valid JSON');
    expect(fs.readFileSync(settings(), 'utf8')).toBe('{ nope');
    expect(fs.existsSync(skill())).toBe(false);
  });

  it('copies to other skill directories with --skills-dir', async () => {
    await init([
      '--skills-dir',
      '.agents/skills',
      '--skills-dir',
      'other',
      '--yes',
    ]);
    for (const target of ['.agents/skills', 'other']) {
      expect(
        fs.existsSync(path.join(dir, target, 'pixsame-verify', 'SKILL.md')),
      ).toBe(true);
    }
    expect(fs.existsSync(skill())).toBe(false);
  });

  it('says what is wrong with the options', async () => {
    expect((await init(['--nope'])).text).toContain('Unknown option --nope');
    expect((await init(['--skills-dir'])).text).toContain(
      '--skills-dir needs a directory',
    );
  });
});
