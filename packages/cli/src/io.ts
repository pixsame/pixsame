import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import type { Plan } from './runner';

export type Io = {
  out: (line: string) => void;
  /** Asks a question; `undefined` when nobody can answer (no terminal). */
  ask?: (question: string) => Promise<string>;
  exec: (plan: Plan) => Promise<number>;
  /** Opens an address in the browser. */
  open: (url: string) => void;
  /** Resolves when the user is done with a running page (Ctrl-C). */
  wait: () => Promise<void>;
  cwd: string;
};

/** The real terminal, process and browser; tests pass their own `Io`. */
export const defaults = (): Io => {
  const interactive = process.stdin.isTTY && process.stdout.isTTY;
  return {
    out: (line) => void process.stdout.write(`${line}\n`),
    ask: interactive
      ? async (question) => {
          const rl = createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          try {
            return (await rl.question(`${question} `)).trim();
          } finally {
            rl.close();
          }
        }
      : undefined,
    exec: (plan) =>
      new Promise((resolve, reject) => {
        const [program, ...args] = plan.command;
        const child = spawn(program, args, {
          cwd: plan.cwd,
          stdio: 'inherit',
          env: { ...process.env, ...plan.env },
          shell: process.platform === 'win32',
        });
        child.on('error', reject);
        child.on('close', (code) => resolve(code ?? 1));
      }),
    open: (url) => {
      const [program, ...args] =
        process.platform === 'darwin'
          ? ['open', url]
          : process.platform === 'win32'
            ? ['cmd', '/c', 'start', '', url]
            : ['xdg-open', url];
      spawn(program, args, { stdio: 'ignore', detached: true })
        .on('error', () => undefined)
        .unref();
    },
    wait: () => new Promise((resolve) => process.once('SIGINT', resolve)),
    cwd: process.cwd(),
  };
};
