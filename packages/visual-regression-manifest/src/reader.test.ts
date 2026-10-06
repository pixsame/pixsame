import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { manifest, tmpDir } from '../__tests__/helpers';
import {
  findManifestFiles,
  isManifest,
  ManifestParseError,
  manifestSchema,
  parseManifest,
  parseManifestJson,
  readManifestFile,
  readManifestFiles,
  validateManifest,
} from './reader';

describe('parseManifest', () => {
  it('returns a valid manifest as-is, keeping unknown fields', () => {
    const input = { ...manifest(), extra: { future: true } };
    expect(parseManifest(input)).toBe(input);
    expect(isManifest(input)).toBe(true);
    expect(validateManifest(input)).toEqual([]);
  });

  it('throws a ManifestParseError naming the source and the first issues', () => {
    expect(() =>
      parseManifest({ ...manifest(), version: 2 }, 'x.json'),
    ).toThrow(ManifestParseError);
    expect(() => parseManifest('nope', 'test:m.json')).toThrow(
      'Invalid manifest test:m.json: (root): expected object, got "nope"',
    );
    expect(isManifest('nope')).toBe(false);
    let error: ManifestParseError | undefined;
    try {
      parseManifest({ version: 1 });
    } catch (e) {
      error = e as ManifestParseError;
    }
    expect(error?.where).toBe('manifest');
    expect(error?.issues.length).toBeGreaterThan(5);
    expect(error?.message).toMatch(/\(\+\d+ more\)$/);
  });

  it('parses raw JSON text and reports syntax errors as issues', () => {
    expect(parseManifestJson(JSON.stringify(manifest()))).toMatchObject({
      version: 1,
    });
    expect(() => parseManifestJson('{', 'broken.json')).toThrow(
      /Invalid manifest broken.json: \(root\): not valid JSON/,
    );
  });

  it('exposes the schema', () => {
    expect(manifestSchema.$id).toMatch(/schema\.json$/);
  });
});

describe('files', () => {
  it('finds, sorts and parses every manifest below a directory', async () => {
    const root = await tmpDir();
    const write = (rel: string, content: unknown) => {
      const file = path.join(root, rel);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(content));
      return file;
    };
    const e2e = write(
      'cypress/screenshots/visual-regression-manifest.e2e.json',
      manifest(),
    );
    const worker = write(
      'pw/visual-regression-manifest.playwright.w0.json',
      manifest([]),
    );
    write('node_modules/x/visual-regression-manifest.json', manifest());
    write('report.json', { not: 'a manifest' });
    write('cypress/screenshots/home.png.json', manifest());

    expect(findManifestFiles(root)).toEqual([e2e, worker]);
    expect(findManifestFiles(root, { ignore: [] })).toHaveLength(3);
    expect(readManifestFiles(root)).toEqual([
      { file: e2e, manifest: manifest() },
      { file: worker, manifest: manifest([]) },
    ]);
    expect(readManifestFile(e2e)).toEqual(manifest());
  });

  it('names the file when it is invalid', async () => {
    const root = await tmpDir();
    const file = path.join(root, 'visual-regression-manifest.json');
    fs.writeFileSync(file, JSON.stringify({ ...manifest(), version: 3 }));
    expect(() => readManifestFile(file)).toThrow(
      `Invalid manifest ${file}: version: expected 1, got 3`,
    );
  });
});
