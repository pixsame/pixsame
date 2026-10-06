import fs from 'fs';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tmpDir } from '../__tests__/helpers';
import { parseManifestJson } from './reader';
import { ManifestWriter, writeManifestFile } from './writer';

const runner = { name: 'test-runner' };

describe('writeManifestFile', () => {
  it('creates the directory and leaves no temporary file behind', async () => {
    const root = await tmpDir();
    const file = path.join(root, 'out', 'visual-regression-manifest.json');
    const writer = new ManifestWriter(file, {
      projectRoot: root,
      runner,
      ci: null,
    });
    writeManifestFile(file, writer.toJSON());
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    expect(parseManifestJson(fs.readFileSync(file, 'utf8')).entries).toEqual(
      [],
    );
  });
});

describe('writeManifestFile temporary files', () => {
  afterEach(() => vi.restoreAllMocks());

  const setup = async () => {
    const root = await tmpDir();
    const file = path.join(root, 'visual-regression-manifest.json');
    const writer = new ManifestWriter(file, {
      projectRoot: root,
      runner,
      ci: null,
    });
    return { root, file, writer };
  };

  it('uses a different temporary file for every write', async () => {
    const { file, writer } = await setup();
    const tmps: string[] = [];
    const rename = fs.renameSync;
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      tmps.push(String(from));
      return rename(from, to);
    });
    writeManifestFile(file, writer.toJSON());
    writeManifestFile(file, writer.toJSON());
    expect(new Set(tmps).size).toBe(2);
    expect(tmps.every((t) => t.endsWith('.tmp'))).toBe(true);
  });

  it('retries a rename that fails transiently', async () => {
    const { file, writer } = await setup();
    const rename = fs.renameSync;
    let failures = 2;
    vi.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (failures-- > 0) {
        throw Object.assign(new Error('busy'), { code: 'EBUSY' });
      }
      return rename(from, to);
    });
    writeManifestFile(file, writer.toJSON());
    expect(fs.existsSync(file)).toBe(true);
  });

  it('removes its temporary file and rethrows when the rename keeps failing', async () => {
    const { root, file, writer } = await setup();
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('nope'), { code: 'ENOSPC' });
    });
    expect(() => writeManifestFile(file, writer.toJSON())).toThrow('nope');
    expect(fs.readdirSync(root)).toEqual([]);
  });

  it('gives up after a bounded number of retries', async () => {
    const { file, writer } = await setup();
    const rename = vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('busy'), { code: 'EPERM' });
    });
    expect(() => writeManifestFile(file, writer.toJSON())).toThrow('busy');
    expect(rename).toHaveBeenCalledTimes(5);
  });

  it('reset clears temporary files a killed writer left behind', async () => {
    const { root, file, writer } = await setup();
    const stale = `${file}.4242.0.tmp`;
    const unrelated = path.join(
      root,
      'visual-regression-manifest.e2e.json.1.0.tmp',
    );
    fs.writeFileSync(stale, '{');
    fs.writeFileSync(unrelated, '{');
    writer.reset();
    expect(fs.existsSync(stale)).toBe(false);
    expect(fs.existsSync(unrelated)).toBe(true);
  });
});

describe('ManifestWriter', () => {
  it('rewrites the file on every change', async () => {
    const root = await tmpDir();
    const file = path.join(root, 'visual-regression-manifest.e2e.json');
    const writer = new ManifestWriter(file, {
      projectRoot: root,
      runner,
      ci: null,
    });
    const read = () => parseManifestJson(fs.readFileSync(file, 'utf8'));

    expect(fs.existsSync(file)).toBe(false);
    writer.record({
      testFile: 'a.spec.ts',
      actualPath: 'a.actual.png',
      baselinePath: 'a.png',
      status: 'failed',
    });
    expect(read().entries.map((e) => e.status)).toEqual(['failed']);

    writer.approve({ actualPath: 'a.actual.png' });
    expect(read().entries.map((e) => e.status)).toEqual(['approved']);

    expect(writer.dropTestFile('other.spec.ts')).toBe(false);
    expect(writer.dropTestFile('a.spec.ts')).toBe(true);
    expect(read().entries).toEqual([]);

    writer.header.runner.browser = { name: 'chrome' };
    writer.write();
    expect(read().runner.browser).toEqual({ name: 'chrome' });

    writer.record({
      actualPath: 'b.png',
      baselinePath: 'b.png',
      status: 'passed',
    });
    writer.reset();
    expect(fs.existsSync(file)).toBe(false);
    expect(writer.size).toBe(0);
    expect(() => writer.reset()).not.toThrow();
  });
});

describe('ManifestWriter with writeDelayMs', () => {
  afterEach(() => vi.useRealTimers());

  const setup = async () => {
    const root = await tmpDir();
    const file = path.join(root, 'visual-regression-manifest.json');
    const writer = new ManifestWriter(
      file,
      { projectRoot: root, runner, ci: null },
      { writeDelayMs: 50 },
    );
    const record = (name: string) =>
      writer.record({
        testFile: 'a.spec.ts',
        actualPath: `${name}.actual.png`,
        baselinePath: `${name}.png`,
        status: 'failed',
      });
    return { file, writer, record };
  };

  it('coalesces changes into one write per delay', async () => {
    vi.useFakeTimers();
    const { file, record } = await setup();
    const write = vi.spyOn(fs, 'writeFileSync');
    record('a');
    record('b');
    record('c');
    expect(fs.existsSync(file)).toBe(false);
    vi.advanceTimersByTime(60);
    expect(write).toHaveBeenCalledTimes(1);
    expect(
      parseManifestJson(fs.readFileSync(file, 'utf8')).entries,
    ).toHaveLength(3);
    write.mockRestore();
  });

  it('flush writes pending changes immediately and only once', async () => {
    vi.useFakeTimers();
    const { file, writer, record } = await setup();
    record('a');
    writer.flush();
    expect(fs.existsSync(file)).toBe(true);
    const write = vi.spyOn(fs, 'writeFileSync');
    writer.flush();
    vi.advanceTimersByTime(100);
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it('writes pending changes when the process exits', async () => {
    const { file, record } = await setup();
    record('a');
    expect(fs.existsSync(file)).toBe(false);
    process.emit('exit', 0);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('reset drops pending changes', async () => {
    vi.useFakeTimers();
    const { file, writer, record } = await setup();
    record('a');
    writer.reset();
    vi.advanceTimersByTime(100);
    expect(fs.existsSync(file)).toBe(false);
  });
});
