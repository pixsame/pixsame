import { vi } from 'vitest';
import { promises as fs } from 'fs';
import { version as cypressVersion } from 'cypress/package.json';

export const Cypress = {
  Promise,
  version: cypressVersion,
  platform: 'darwin',
  browser: { name: 'electron' },
  expose: vi.fn(),
  env: vi.fn(),
  Commands: { add: vi.fn() },
};
vi.stubGlobal('Cypress', Cypress);

export const cy = {
  readFile: vi.fn(fs.readFile),
};
vi.stubGlobal('cy', cy);

export const before = vi.fn();
vi.stubGlobal('before', before);

export const after = vi.fn();
vi.stubGlobal('after', after);

export const beforeEach = vi.fn();
vi.stubGlobal('beforeEach', beforeEach);

export const afterEach = vi.fn();
vi.stubGlobal('afterEach', afterEach);
