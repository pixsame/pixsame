import fs from 'fs';
import path from 'path';
import { deflateSync } from 'zlib';
import { dir, setGracefulCleanup } from 'tmp-promise';
import type { Manifest, ManifestEntry } from '../src/types';

setGracefulCleanup();

export const HEAD_SHA = 'a'.repeat(40);
export const OTHER_SHA = 'b'.repeat(40);

export const tmpDir = async () => (await dir({ unsafeCleanup: true })).path;

/** Unwraps an optional value in a test; fails loudly instead of a non-null assertion. */
export const must = <T>(value: T | null | undefined): T => {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** A valid RGBA PNG of the given size filled with one byte value (so different fills hash differently). */
export const png = (width: number, height: number, fill = 0) => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height, fill);
  for (let y = 0; y < height; y++) raw[y * (width * 4 + 1)] = 0; // filter byte
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

export const writePng = (file: string, width = 2, height = 2, fill = 0) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, png(width, height, fill));
  return file;
};

export const entry = (
  overrides: Partial<ManifestEntry> = {},
): ManifestEntry => ({
  name: 'home_#0',
  test: {
    file: 'cypress/e2e/home.cy.ts',
    titlePath: ['home', 'renders'],
    retry: 0,
  },
  status: 'failed',
  comparison: { diffRatio: 0.12, threshold: 0.01 },
  images: {
    baseline: {
      path: 'cypress/e2e/__image_snapshots__/home_#0.png',
      width: 10,
      height: 10,
    },
    actual: {
      path: 'cypress/e2e/__image_snapshots__/home_#0.actual.png',
      width: 10,
      height: 10,
    },
    diff: { path: 'cypress/e2e/__image_snapshots__/home_#0.diff.png' },
  },
  baselineWritten: false,
  recordedAt: '2026-09-22T10:00:00.000Z',
  platform: {
    os: 'linux',
    arch: 'x64',
    browser: { name: 'electron', version: '130' },
  },
  viewport: { width: 1000, height: 660 },
  renderer: { backend: 'native', browser: 'electron', browserVersion: '130' },
  hashes: { baseline: 'f'.repeat(64), actual: '0'.repeat(64) },
  message:
    'Image diff factor (12%) is bigger than maximum threshold option 1%.',
  ...overrides,
});

export const manifest = (
  entries: ManifestEntry[] = [entry()],
  overrides: Partial<Manifest> = {},
): Manifest => ({
  version: 1,
  createdAt: '2026-09-22T10:00:00.000Z',
  updatedAt: '2026-09-22T10:03:00.000Z',
  projectRoot: '/home/runner/work/r/r',
  platform: { os: 'linux', arch: 'x64', osVersion: '6.8.0' },
  ci: {
    provider: 'github',
    repository: 'o/r',
    sha: 'c'.repeat(40),
    ref: 'refs/pull/7/merge',
    pullRequest: {
      number: 7,
      headSha: HEAD_SHA,
      headRef: 'feat/x',
      baseRef: 'main',
    },
    runId: '555',
    runAttempt: '1',
    workspace: '/home/runner/work/r/r',
  },
  options: { updateImages: 'failures-only' },
  runner: {
    name: 'cypress',
    version: '16.1.0',
    testingType: 'e2e',
    mode: 'run',
    configFile: 'cypress.config.ts',
    browser: {
      name: 'electron',
      version: '130',
      family: 'chromium',
      headless: true,
    },
    specs: ['cypress/e2e/home.cy.ts'],
    specPattern: 'cypress/e2e/**/*.cy.ts',
    baseUrl: null,
    viewport: { width: 1000, height: 660 },
    cloud: { runUrl: 'https://cloud.cypress.io/x', parallel: false },
  },
  entries,
  ...overrides,
});
