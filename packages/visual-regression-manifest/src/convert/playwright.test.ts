import path from 'path';
import { describe, expect, it } from 'vitest';
import { tmpDir, writePng } from '../../__tests__/helpers';
import { isManifest } from '../reader';
import { fromPlaywrightReport, type PlaywrightJsonReport } from './playwright';

const pixelsError = (actual: string, expected: string) => ({
  message:
    'Error: expect(page).toHaveScreenshot(expected) failed\n\n' +
    '  8 pixels (ratio 0.02 of all image pixels) are different.\n\n' +
    `Expected: ${expected}\nReceived: ${actual}\nDiff: ${actual.replace('-actual', '-diff')}\n`,
});

const report = (root: string): PlaywrightJsonReport => {
  const results = `${root}/test-results`;
  return {
    config: {
      rootDir: root,
      version: '1.63.0',
      projects: [
        {
          id: 'chromium',
          name: 'chromium',
          testDir: `${root}/tests`,
          outputDir: results,
        },
        {
          id: 'webkit',
          name: 'webkit',
          testDir: `${root}/tests`,
          outputDir: results,
        },
      ],
    },
    suites: [
      {
        title: 'home.spec.ts',
        file: 'tests/home.spec.ts',
        specs: [
          {
            title: 'passes without a trace',
            file: 'tests/home.spec.ts',
            tests: [
              {
                projectName: 'chromium',
                results: [{ status: 'passed', retry: 0, attachments: [] }],
              },
            ],
          },
          {
            title: 'flaky then green',
            file: 'tests/home.spec.ts',
            tests: [
              {
                projectName: 'chromium',
                results: [
                  {
                    status: 'failed',
                    retry: 0,
                    errors: [
                      pixelsError(
                        `${results}/home-flaky-chromium/flaky-actual.png`,
                        `${results}/home-flaky-chromium/flaky-expected.png`,
                      ),
                    ],
                    attachments: [
                      {
                        name: 'flaky-expected.png',
                        contentType: 'image/png',
                        path: `${results}/home-flaky-chromium/flaky-expected.png`,
                      },
                      {
                        name: 'flaky-actual.png',
                        contentType: 'image/png',
                        path: `${results}/home-flaky-chromium/flaky-actual.png`,
                      },
                      {
                        name: 'flaky-diff.png',
                        contentType: 'image/png',
                        path: `${results}/home-flaky-chromium/flaky-diff.png`,
                      },
                    ],
                  },
                  { status: 'passed', retry: 1, attachments: [] },
                ],
              },
            ],
          },
        ],
        suites: [
          {
            title: 'header',
            file: 'tests/home.spec.ts',
            specs: [
              {
                title: 'renders',
                file: 'tests/home.spec.ts',
                tests: [
                  {
                    projectName: 'chromium',
                    results: [
                      {
                        status: 'failed',
                        retry: 0,
                        startTime: '2026-09-25T10:00:00.000Z',
                        errors: [
                          pixelsError(
                            `${results}/home-header-renders-chromium/header-actual.png`,
                            `${results}/home-header-renders-chromium/header-expected.png`,
                          ),
                          {
                            message: `Error: A snapshot doesn't exist at ${root}/tests/home.spec.ts-snapshots/footer-chromium-linux.png, writing actual.`,
                          },
                        ],
                        attachments: [
                          {
                            name: 'header-expected.png',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-chromium/header-expected.png`,
                          },
                          {
                            name: 'header-actual.png',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-chromium/header-actual.png`,
                          },
                          {
                            name: 'header-diff.png',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-chromium/header-diff.png`,
                          },
                          {
                            name: 'footer-actual.png',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-chromium/footer-actual.png`,
                          },
                          {
                            name: 'trace',
                            contentType: 'application/zip',
                            path: `${results}/home-header-renders-chromium/trace.zip`,
                          },
                          {
                            name: 'screenshot',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-chromium/test-failed-1.png`,
                          },
                        ],
                      },
                    ],
                  },
                  {
                    projectName: 'webkit',
                    results: [
                      {
                        status: 'failed',
                        retry: 0,
                        error: {
                          message: `Error: A snapshot doesn't exist at ${root}/tests/home.spec.ts-snapshots/header-webkit-linux.png.`,
                        },
                        attachments: [
                          {
                            name: 'header-actual.png',
                            contentType: 'image/png',
                            path: `${results}/home-header-renders-webkit/header-actual.png`,
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
};

describe('fromPlaywrightReport', () => {
  it('converts the last attempt of every test that left images behind', async () => {
    const root = (await tmpDir()).replace(/\\/g, '/');
    const results = path.join(root, 'test-results');
    writePng(
      path.join(
        root,
        'tests',
        'home.spec.ts-snapshots',
        'header-chromium-linux.png',
      ),
      5,
      5,
    );
    writePng(
      path.join(results, 'home-header-renders-chromium', 'header-actual.png'),
      5,
      6,
      1,
    );
    writePng(
      path.join(results, 'home-header-renders-chromium', 'header-diff.png'),
      5,
      6,
      2,
    );
    writePng(
      path.join(results, 'home-header-renders-chromium', 'footer-actual.png'),
      3,
      3,
    );
    writePng(
      path.join(results, 'home-header-renders-webkit', 'header-actual.png'),
      7,
      7,
    );

    const manifest = fromPlaywrightReport(report(root), {
      platform: 'linux',
      threshold: 0.01,
      ci: null,
      browsers: { webkit: { name: 'webkit', version: '18' } },
      createdAt: '2026-09-25T09:59:00.000Z',
    });

    expect(isManifest(manifest)).toBe(true);
    expect(manifest).toMatchObject({
      projectRoot: root,
      createdAt: '2026-09-25T09:59:00.000Z',
      runner: {
        name: 'playwright',
        version: '1.63.0',
        mode: 'run',
        projects: ['chromium', 'webkit'],
      },
    });
    expect(manifest.entries).toEqual([
      {
        name: 'footer-chromium-linux',
        test: {
          file: 'tests/home.spec.ts',
          titlePath: ['header', 'renders'],
          retry: 0,
        },
        status: 'created',
        comparison: { diffRatio: 0, threshold: 0.01 },
        images: {
          baseline: {
            path: 'tests/home.spec.ts-snapshots/footer-chromium-linux.png',
          },
          actual: {
            path: 'test-results/home-header-renders-chromium/footer-actual.png',
            width: 3,
            height: 3,
          },
          diff: { path: null },
        },
        baselineWritten: true,
        recordedAt: '2026-09-25T10:00:00.000Z',
        platform: { os: 'linux', browser: { name: 'chromium' } },
        viewport: undefined,
        options: undefined,
        renderer: { backend: 'native', browser: 'chromium' },
        hashes: { actual: expect.any(String) },
        message: `Error: A snapshot doesn't exist at ${root}/tests/home.spec.ts-snapshots/footer-chromium-linux.png, writing actual.`,
      },
      {
        name: 'header-chromium-linux',
        test: {
          file: 'tests/home.spec.ts',
          titlePath: ['header', 'renders'],
          retry: 0,
        },
        status: 'failed',
        comparison: { diffRatio: 0.02, threshold: 0.01 },
        images: {
          baseline: {
            path: 'tests/home.spec.ts-snapshots/header-chromium-linux.png',
            width: 5,
            height: 5,
          },
          actual: {
            path: 'test-results/home-header-renders-chromium/header-actual.png',
            width: 5,
            height: 6,
          },
          diff: {
            path: 'test-results/home-header-renders-chromium/header-diff.png',
          },
        },
        baselineWritten: false,
        recordedAt: '2026-09-25T10:00:00.000Z',
        platform: { os: 'linux', browser: { name: 'chromium' } },
        viewport: undefined,
        options: undefined,
        renderer: { backend: 'native', browser: 'chromium' },
        hashes: {
          baseline: expect.any(String),
          actual: expect.any(String),
          diff: expect.any(String),
        },
        message: 'Error: expect(page).toHaveScreenshot(expected) failed',
      },
      {
        name: 'header-webkit-linux',
        test: {
          file: 'tests/home.spec.ts',
          titlePath: ['header', 'renders'],
          retry: 0,
        },
        status: 'missing-baseline',
        comparison: { diffRatio: 0, threshold: 0.01 },
        images: {
          baseline: {
            path: 'tests/home.spec.ts-snapshots/header-webkit-linux.png',
          },
          actual: {
            path: 'test-results/home-header-renders-webkit/header-actual.png',
            width: 7,
            height: 7,
          },
          diff: { path: null },
        },
        baselineWritten: false,
        recordedAt: expect.any(String),
        platform: { os: 'linux', browser: { name: 'webkit', version: '18' } },
        viewport: undefined,
        options: undefined,
        renderer: {
          backend: 'native',
          browser: 'webkit',
          browserVersion: '18',
        },
        hashes: { actual: expect.any(String) },
        message: `Error: A snapshot doesn't exist at ${root}/tests/home.spec.ts-snapshots/header-webkit-linux.png.`,
      },
    ]);
  });

  it('honours a custom snapshot path template and directory, and a project root', async () => {
    const root = (await tmpDir()).replace(/\\/g, '/');
    const manifest = fromPlaywrightReport(report(root), {
      projectRoot: path.join(root, 'tests'),
      snapshotDir: '__screenshots__',
      snapshotPathTemplate:
        '{snapshotDir}/{platform}/{projectName}/{testFilePath}/{testName}/{arg}{ext}',
      platform: 'darwin',
      ci: null,
    });
    expect(
      manifest.entries.map((e) => [
        e.name,
        e.images.baseline.path,
        e.test.file,
      ]),
    ).toEqual([
      [
        'footer',
        '../__screenshots__/darwin/chromium/home.spec.ts/header-renders/footer.png',
        'home.spec.ts',
      ],
      [
        'header',
        '../__screenshots__/darwin/chromium/home.spec.ts/header-renders/header.png',
        'home.spec.ts',
      ],
      [
        'header',
        '../__screenshots__/darwin/webkit/home.spec.ts/header-renders/header.png',
        'home.spec.ts',
      ],
    ]);
    // sizes come from the expected copy when the baseline itself is not around
    expect(manifest.entries[1]?.images.baseline).not.toHaveProperty('width');
  });

  it('copes with a report without projects or config and rejects other JSON', () => {
    const manifest = fromPlaywrightReport(
      {
        suites: [
          {
            title: 'a.spec.ts',
            file: 'a.spec.ts',
            specs: [
              {
                title: 't',
                file: 'a.spec.ts',
                tests: [
                  {
                    results: [
                      {
                        status: 'failed',
                        retry: 2,
                        errors: [
                          {
                            message:
                              'Error: 1 pixels (ratio 0.5 of all image pixels) are different.',
                          },
                        ],
                        attachments: [
                          {
                            name: 'shot-expected.png',
                            path: '/r/test-results/a-t/shot-expected.png',
                          },
                          {
                            name: 'shot-actual.png',
                            path: '/r/test-results/a-t/shot-actual.png',
                          },
                          { name: 'no-path-actual.png' },
                        ],
                      },
                    ],
                  },
                  { results: [] },
                ],
              },
            ],
          },
        ],
      },
      { projectRoot: '/r', platform: 'linux', ci: null },
    );
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0]).toMatchObject({
      name: 'shot-linux',
      test: { file: 'a.spec.ts', titlePath: ['t'], retry: 2 },
      status: 'failed',
      comparison: { diffRatio: 0.5, threshold: 0 },
      images: {
        baseline: { path: 'a.spec.ts-snapshots/shot-linux.png' },
        actual: { path: null },
        diff: { path: null },
      },
    });
    expect(manifest.entries[0]?.platform).toBeUndefined();
    expect(manifest.runner).toEqual({
      name: 'playwright',
      version: undefined,
      mode: 'run',
      projects: [],
    });
    expect(() => fromPlaywrightReport({} as never)).toThrow(
      /Not a Playwright JSON report/,
    );
    expect(() => fromPlaywrightReport(null as never)).toThrow(TypeError);
  });
});
