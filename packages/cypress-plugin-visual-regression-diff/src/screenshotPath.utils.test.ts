import { it, expect, describe, beforeEach } from 'vitest';
import path from 'path';
import {
  expandPathVariables,
  generateScreenshotPath,
  resetScreenshotNameCache,
  wasScreenshotUsed,
} from './screenshotPath.utils';
import { IMAGE_SNAPSHOT_PREFIX } from './constants';

const pathVariables = { os: 'linux', browser: 'chrome' };

const shot = (
  title: string,
  { retry = 0, testId = 'r1' }: { retry?: number; testId?: string } = {},
) =>
  generateScreenshotPath({
    titleFromOptions: title,
    imagesPath: 'images',
    specPath: 'some/spec.ts',
    pathVariables,
    currentRetryNumber: retry,
    testId,
  }).replace(/^.*\/images\//, '');

// the directory part of a generated path, with `/` separators
const dirFor = (
  imagesPath: string,
  variables = pathVariables,
  specPath = 'some/nested/spec.ts',
) =>
  path
    .dirname(
      generateScreenshotPath({
        titleFromOptions: 'title',
        imagesPath,
        specPath,
        pathVariables: variables,
        currentRetryNumber: 0,
        testId: 'r1',
      }),
    )
    .split(path.sep)
    .join('/')
    .replace(`${IMAGE_SNAPSHOT_PREFIX}/`, '');

beforeEach(resetScreenshotNameCache);

describe('path variables', () => {
  it('expands {platform}, {os} and {browser} as whole segments', () => {
    expect(dirFor('shots/{platform}')).toBe('shots/linux-chrome');
    expect(dirFor('shots/{os}/{browser}')).toBe('shots/linux/chrome');
  });

  it('splits by OS or by browser alone', () => {
    expect(dirFor('shots/{os}')).toBe('shots/linux');
    expect(dirFor('shots/{browser}')).toBe('shots/chrome');
    expect(
      dirFor('shots/{browser}', { os: 'darwin', browser: 'electron' }),
    ).toBe('shots/electron');
  });

  it('keeps the default layout untouched when no token is used', () => {
    expect(dirFor('{spec_path}/__image_snapshots__')).toBe(
      'some/nested/__image_snapshots__',
    );
  });

  it('expands tokens embedded in a segment, repeatedly', () => {
    expect(dirFor('shots-{platform}')).toBe('shots-linux-chrome');
    expect(dirFor('{browser}-{browser}/{os}_x')).toBe('chrome-chrome/linux_x');
  });

  it('combines with {spec_path}, which still has to be a whole segment', () => {
    expect(dirFor('{spec_path}/__image_snapshots__/{platform}')).toBe(
      'some/nested/__image_snapshots__/linux-chrome',
    );
    expect(dirFor('{spec_path}-{platform}')).toBe('{spec_path}-linux-chrome');
  });

  it('works at the end of absolute paths', () => {
    expect(dirFor('/abs/{platform}')).toBe(
      '{unix_system_root_path}/abs/linux-chrome',
    );
    expect(dirFor('C:/abs/{os}')).toBe('{win_system_root_path}/C/abs/linux');
  });

  it('leaves unknown tokens alone', () => {
    expect(dirFor('{nope}/{platform}')).toBe('{nope}/linux-chrome');
  });

  it('sanitizes the values so they are valid directory names', () => {
    expect(
      expandPathVariables('{platform}', {
        os: 'win32',
        browser: 'my/br:ow*ser',
      }),
    ).toBe('win32-mybrowser');
    expect(expandPathVariables('{browser}', { os: 'linux', browser: '' })).toBe(
      'unknown',
    );
    expect(expandPathVariables('{os}', { os: '..', browser: 'x' })).toBe(
      'unknown',
    );
  });

  it('does not throw when a value is missing (dropped by the task bridge)', () => {
    expect(
      expandPathVariables('{platform}', {
        os: 'linux',
        browser: undefined as unknown as string,
      }),
    ).toBe('linux-unknown');
  });

  it('numbers and retries screenshots per expanded path', () => {
    const tokenised = (retry = 0) =>
      generateScreenshotPath({
        titleFromOptions: 'title',
        imagesPath: 'shots/{platform}',
        specPath: 'some/spec.ts',
        pathVariables,
        currentRetryNumber: retry,
        testId: 'r1',
      })
        .split(path.sep)
        .join('/')
        .replace(`${IMAGE_SNAPSHOT_PREFIX}/`, '');
    expect([tokenised(), tokenised()]).toEqual([
      'shots/linux-chrome/title_#0.actual.png',
      'shots/linux-chrome/title_#1.actual.png',
    ]);
    // a retry of the same test reuses the names of the failed attempt
    expect(tokenised(1)).toBe('shots/linux-chrome/title_#0.actual.png');
  });

  it("does not count another platform's screenshot as used", () => {
    dirFor('shots/{platform}');
    expect(wasScreenshotUsed('shots/linux-chrome/title_#0.png')).toBe(true);
    expect(wasScreenshotUsed('shots/darwin-chrome/title_#0.png')).toBe(false);
  });
});

describe('generateScreenshotPath', () => {
  it('numbers repeated screenshots of the same title', () => {
    expect([shot('a'), shot('a'), shot('b')]).toEqual([
      'a_#0.actual.png',
      'a_#1.actual.png',
      'b_#0.actual.png',
    ]);
  });

  it('keeps numbering across tests that share a title', () => {
    shot('a', { testId: 'r1' });
    expect(shot('a', { testId: 'r2' })).toBe('a_#1.actual.png');
  });

  it('reuses the names of the failed attempt on retry', () => {
    shot('a');
    shot('a');
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(shot('a', { retry: 1 })).toBe('a_#1.actual.png');
    expect(shot('a', { retry: 2 })).toBe('a_#0.actual.png');
  });

  it('restores every title the failed attempt used, not only the last one', () => {
    shot('a');
    shot('b');
    shot('b');
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(shot('b', { retry: 1 })).toBe('b_#0.actual.png');
    expect(shot('b', { retry: 1 })).toBe('b_#1.actual.png');
  });

  it('does not rewind counters that belong to earlier tests', () => {
    shot('a', { testId: 'r1' });
    shot('a', { testId: 'r2' });
    expect(shot('a', { testId: 'r2', retry: 1 })).toBe('a_#1.actual.png');
    expect(wasScreenshotUsed('images/a_#0.png')).toBe(true);
  });

  it('starts a fresh attempt for the next test after a retried one', () => {
    shot('a', { testId: 'r1' });
    shot('a', { testId: 'r1', retry: 1 });
    // the next test is at retry 0 again and must not touch r1's counters
    expect(shot('a', { testId: 'r2' })).toBe('a_#1.actual.png');
    expect(shot('a', { testId: 'r2', retry: 1 })).toBe('a_#1.actual.png');
  });

  it('forgets screenshots of the failed attempt for cleanup purposes', () => {
    shot('a');
    shot('a');
    expect(wasScreenshotUsed('images/a_#1.png')).toBe(true);
    shot('a', { retry: 1 });
    expect(wasScreenshotUsed('images/a_#0.actual.png')).toBe(true);
    expect(wasScreenshotUsed('images/a_#1.png')).toBe(false);
  });
});

describe('resetScreenshotNameCache', () => {
  it('starts numbering from scratch', () => {
    shot('a');
    resetScreenshotNameCache();
    expect(shot('a', { retry: 1 })).toBe('a_#0.actual.png');
    expect(wasScreenshotUsed('images/a_#0.png')).toBe(true);
    expect(wasScreenshotUsed('images/nope_#0.png')).toBe(false);
  });
});
