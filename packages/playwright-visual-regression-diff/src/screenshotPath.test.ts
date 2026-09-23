import { describe, expect, it } from 'vitest';
import path from 'path';
import {
  expandPathVariables,
  resolveImagesDir,
  ScreenshotNamer,
} from './screenshotPath';

const vars = { os: 'linux', browser: 'chromium' };
const dirFor = (imagesPath: string, specPath = 'tests/nested/home.spec.ts') =>
  resolveImagesDir({
    imagesPath,
    specPath,
    rootDir: '/root',
    pathVariables: vars,
  })
    .split(path.sep)
    .join('/');

describe('resolveImagesDir', () => {
  it('resolves relative paths against rootDir and expands {spec_path}', () => {
    expect(dirFor('{spec_path}/__image_snapshots__')).toBe(
      '/root/tests/nested/__image_snapshots__',
    );
    expect(dirFor('shots')).toBe('/root/shots');
  });

  it('expands the platform tokens as whole segments and inside segments', () => {
    expect(dirFor('{spec_path}/__image_snapshots__/{platform}')).toBe(
      '/root/tests/nested/__image_snapshots__/linux-chromium',
    );
    expect(dirFor('shots-{os}/{browser}')).toBe('/root/shots-linux/chromium');
    // {spec_path} expands to several segments, so it has to be one on its own
    expect(dirFor('{spec_path}-{browser}')).toBe('/root/{spec_path}-chromium');
    expect(dirFor('{nope}/{os}')).toBe('/root/{nope}/linux');
  });

  it('keeps absolute paths absolute', () => {
    expect(dirFor('/abs/{platform}')).toBe('/abs/linux-chromium');
  });

  it('sanitises token values', () => {
    expect(
      expandPathVariables('{platform}', {
        os: 'win32',
        browser: 'my/br:ow*ser',
      }),
    ).toBe('win32-mybrowser');
    expect(expandPathVariables('{browser}', { os: 'linux', browser: '' })).toBe(
      'unknown',
    );
  });
});

describe('ScreenshotNamer', () => {
  it('numbers repeated titles per directory and sanitises them', () => {
    const namer = new ScreenshotNamer();
    expect(namer.next('/a', 'home renders')).toBe('home renders_#0');
    expect(namer.next('/a', 'home renders')).toBe('home renders_#1');
    expect(namer.next('/b', 'home renders')).toBe('home renders_#0');
    expect(namer.next('/a', 'a/b:c')).toBe('abc_#0');
  });
});
