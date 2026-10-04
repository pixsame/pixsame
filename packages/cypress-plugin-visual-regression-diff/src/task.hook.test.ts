import { it, expect, describe, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { promises as fs, existsSync, readFileSync } from 'fs';
import { PNG } from 'pngjs';
import { dir, file, setGracefulCleanup, withFile } from 'tmp-promise';
import {
  approveImageTask,
  compareImagesTask,
  doesFileExistTask,
  getScreenshotPathInfoTask,
  CompareImagesCfg,
  cleanupImagesTask,
  recordPendingDiffTask,
  getPendingDiffsTask,
  clearPendingDiffsTask,
} from './task.hook';
import { generateScreenshotPath } from './screenshotPath.utils';
import { getPNGMetadata, isImageGeneratedByPlugin } from './image.utils';
import { IMAGE_SNAPSHOT_PREFIX } from './constants';

setGracefulCleanup();

const fixturesPath = path.resolve(__dirname, '..', '__tests__', 'fixtures');
const oldImgFixture = 'screenshot.png';
const newImgFixture = 'screenshot.actual.png';
const newFileContent = 'new file content';

const generateConfig = async (cfg: Partial<CompareImagesCfg>) => ({
  updateImages: false,
  createMissingImages: true,
  scaleFactor: 1,
  title: 'some title',
  imgNew: await writeTmpFixture((await file()).path, newImgFixture),
  imgOld: await writeTmpFixture((await file()).path, oldImgFixture),
  maxDiffThreshold: 0.5,
  diffConfig: {},
  ...cfg,
});
// pngjs drops tEXt chunks on re-encode, which yields a PNG without the plugin
// metadata - exactly what Cypress (or sharp) hands over as the .actual.png file
const stripMetadata = (png: Buffer) => PNG.sync.write(PNG.sync.read(png));
const writeUnstampedFixture = async (
  pathToWriteTo: string,
  fixtureName: string,
) => {
  await fs.mkdir(path.dirname(pathToWriteTo), { recursive: true });
  await fs.writeFile(
    pathToWriteTo,
    stripMetadata(await fs.readFile(path.join(fixturesPath, fixtureName))),
  );
  return pathToWriteTo;
};
const writeTmpFixture = async (pathToWriteTo: string, fixtureName: string) => {
  await fs.mkdir(path.dirname(pathToWriteTo), { recursive: true });
  await fs.writeFile(
    pathToWriteTo,
    await fs.readFile(path.join(fixturesPath, fixtureName)),
  );
  return pathToWriteTo;
};

describe('getScreenshotPathInfoTask', () => {
  const specPath = 'some/nested/spec-path/spec.ts';

  it('returns sanitized path and title', () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: 'some-title-withśpęćiał人物',
        imagesPath: 'nested/images/dir',
        specPath,
        currentRetryNumber: 0,
        testId: 'r1',
      }),
    ).toEqual({
      screenshotPath:
        '__cp-visual-regression-diff_snapshots__/nested/images/dir/some-title-withśpęćiał人物_#0.actual.png',
      title: 'some-title-withśpęćiał人物_#0.actual',
    });
  });

  it('supports {spec_path} variable', () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: 'some-title',
        imagesPath: '{spec_path}/images/dir',
        specPath,
        currentRetryNumber: 0,
        testId: 'r1',
      }),
    ).toEqual({
      screenshotPath:
        '__cp-visual-regression-diff_snapshots__/some/nested/spec-path/images/dir/some-title_#0.actual.png',
      title: 'some-title_#0.actual',
    });
  });

  it('supports OS-specific absolute paths', () => {
    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: 'some-title',
        imagesPath: '/images/dir',
        specPath,
        currentRetryNumber: 0,
        testId: 'r1',
      }),
    ).toEqual({
      screenshotPath:
        '__cp-visual-regression-diff_snapshots__/{unix_system_root_path}/images/dir/some-title_#0.actual.png',
      title: 'some-title_#0.actual',
    });

    expect(
      getScreenshotPathInfoTask({
        titleFromOptions: 'some-title',
        imagesPath: 'C:/images/dir',
        specPath,
        currentRetryNumber: 0,
        testId: 'r1',
      }),
    ).toEqual({
      screenshotPath:
        '__cp-visual-regression-diff_snapshots__/{win_system_root_path}/C/images/dir/some-title_#0.actual.png',
      title: 'some-title_#0.actual',
    });
  });
});

describe('cleanupImagesTask', () => {
  describe('when env is set', () => {
    const generateUsedScreenshotPath = async (projectRoot: string) => {
      const screenshotPathWithPrefix = generateScreenshotPath({
        titleFromOptions: 'some-file',
        imagesPath: 'images',
        specPath: 'some/spec/path',
        currentRetryNumber: 0,
        testId: 'r1',
      });
      return path.join(
        projectRoot,
        screenshotPathWithPrefix.substring(
          IMAGE_SNAPSHOT_PREFIX.length + path.sep.length,
        ),
      );
    };

    it('does not remove non-plugin PNG files', async () => {
      const { path: projectRoot } = await dir();
      // write a plain PNG without plugin metadata
      const plainPngPath = path.join(projectRoot, 'plain.png');
      await writeTmpFixture(plainPngPath, oldImgFixture);
      // overwrite metadata to remove plugin marker
      const { promises: fsp } = await import('fs');
      await fsp.writeFile(
        plainPngPath,
        Buffer.from([
          137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0,
          1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222, 0, 0, 0, 12, 73, 68,
          65, 84, 8, 215, 99, 248, 207, 192, 0, 0, 0, 2, 0, 1, 226, 33, 188, 51,
          0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
        ]),
      );

      cleanupImagesTask({
        projectRoot,
        version: '13.17.0',
        env: { pluginVisualRegressionCleanupUnusedImages: true },
        testingType: 'e2e',
      } as unknown as Cypress.PluginConfigOptions);

      expect(existsSync(plainPngPath)).toBe(true);
    });

    describe('when no testingType is specified', () => {
      it('removes any unused plugin-generated screenshot', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          path.join(projectRoot, 'some-file-2_#0.png'),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '13.17.0',
          env: { pluginVisualRegressionCleanupUnusedImages: true },
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(false);
      });
    });

    describe('when testing type does not match', () => {
      it('does not remove unused screenshot', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          path.join(projectRoot, 'some-file-2_#0.png'),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '13.17.0',
          env: { pluginVisualRegressionCleanupUnusedImages: true },
          testingType: 'component',
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(true);
      });
    });

    describe('when testing type matches', () => {
      it('does not remove used screenshot', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          await generateUsedScreenshotPath(projectRoot),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '13.17.0',
          env: { pluginVisualRegressionCleanupUnusedImages: true },
          testingType: 'e2e',
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(true);
      });

      it('removes unused screenshot', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          path.join(projectRoot, 'some-file-2_#0.png'),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '13.17.0',
          env: { pluginVisualRegressionCleanupUnusedImages: true },
          testingType: 'e2e',
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(false);
      });
    });

    describe('with Cypress 15.10+ (expose API)', () => {
      it('reads pluginVisualRegressionCleanupUnusedImages from config.expose', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          path.join(projectRoot, 'some-file-2_#0.png'),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '15.10.0',
          expose: { pluginVisualRegressionCleanupUnusedImages: true },
          env: {},
          testingType: 'e2e',
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(false);
      });

      it('does not remove images when expose flag is not set', async () => {
        const { path: projectRoot } = await dir();
        const screenshotPath = await writeTmpFixture(
          path.join(projectRoot, 'some-file-2_#0.png'),
          oldImgFixture,
        );

        cleanupImagesTask({
          projectRoot,
          version: '15.10.0',
          expose: {},
          env: {},
          testingType: 'e2e',
        } as unknown as Cypress.PluginConfigOptions);

        expect(existsSync(screenshotPath)).toBe(true);
      });
    });
  });
});

describe('approveImageTask', () => {
  let newImgPath: string;
  let oldImgPath: string;
  let diffImgPath: string;

  beforeEach(() =>
    withFile(async ({ path }) => {
      oldImgPath = path;
      newImgPath = `${oldImgPath}.actual`;
      await fs.writeFile(newImgPath, newFileContent);
      diffImgPath = `${oldImgPath}.diff`;
      await fs.writeFile(diffImgPath, '');
    }),
  );
  afterEach(async () => {
    if (existsSync(diffImgPath)) await fs.unlink(diffImgPath);
    if (existsSync(newImgPath)) await fs.unlink(newImgPath);
  });

  it('removes diff image and replaces old with new', async () => {
    await approveImageTask({ img: newImgPath });

    expect((await fs.readFile(oldImgPath)).toString()).toBe(newFileContent);
    expect(existsSync(newImgPath)).toBe(false);
    expect(existsSync(diffImgPath)).toBe(false);
  });

  it('writes to imgOld path when provided', async () => {
    const { path: customOldPath } = await file();
    await approveImageTask({ img: newImgPath, imgOld: customOldPath });

    expect((await fs.readFile(customOldPath)).toString()).toBe(newFileContent);
    expect(existsSync(newImgPath)).toBe(false);
  });
});

describe('compareImagesTask', () => {
  describe('when images should be updated', () => {
    describe('when old screenshot exists', () => {
      it('resolves with a success message', async () =>
        expect(
          compareImagesTask(
            { testingType: 'e2e' },
            await generateConfig({ updateImages: true }),
          ),
        ).resolves.toEqual({
          error: false,
          message:
            'Image diff factor (0%) is within boundaries of maximum threshold option 50%.',
          imgDiff: 0,
          imgDiffBase64: '',
          imgNewBase64: '',
          imgOldBase64: '',
          maxDiffThreshold: 0.5,
        }));
    });
  });

  describe('when updateImages is failures-only', () => {
    describe('when images differ beyond threshold', () => {
      it('updates baseline and resolves with success message', async () => {
        const cfg = await generateConfig({
          updateImages: 'failures-only',
          maxDiffThreshold: 0,
        });
        const result = await compareImagesTask({ testingType: 'e2e' }, cfg);

        expect(result).toMatchObject({
          error: false,
          message: expect.stringContaining('was bigger than maximum threshold'),
        });
        expect(existsSync(cfg.imgOld)).toBe(true);
        expect(existsSync(cfg.imgNew)).toBe(false);
      });
    });

    describe('when images are within threshold', () => {
      it('resolves with a success message without updating', async () => {
        const cfg = await generateConfig({
          updateImages: 'failures-only',
          maxDiffThreshold: 0.5,
        });
        await writeTmpFixture(cfg.imgNew, oldImgFixture);
        const result = await compareImagesTask({ testingType: 'e2e' }, cfg);

        expect(result).toMatchObject({ error: false });
        expect(existsSync(cfg.imgNew)).toBe(false);
      });
    });
  });

  describe("when images shouldn't be updated", () => {
    describe("when old screenshot doesn't exist", () => {
      it('resolves with a success message', async () => {
        const cfg = await generateConfig({ updateImages: false });
        await fs.unlink(cfg.imgOld);

        await expect(
          compareImagesTask({ testingType: 'e2e' }, cfg),
        ).resolves.toEqual({
          error: false,
          message:
            'Image diff factor (0%) is within boundaries of maximum threshold option 50%.',
          imgDiff: 0,
          imgDiffBase64: '',
          imgNewBase64: '',
          imgOldBase64: '',
          maxDiffThreshold: 0.5,
        });
      });

      describe('when createMissingImages=false', () => {
        it('rejects with error message', async () => {
          const cfg = await generateConfig({
            updateImages: false,
            createMissingImages: false,
          });
          await fs.unlink(cfg.imgOld);

          await expect(
            compareImagesTask({ testingType: 'e2e' }, cfg),
          ).resolves.toEqual({
            error: true,
            message: `Baseline image is missing at path: "${cfg.imgOld}". Provide a baseline image or enable "createMissingImages" option in plugin configuration.`,
            imgDiff: 0,
            imgDiffBase64: '',
            imgNewBase64: '',
            imgOldBase64: '',
            maxDiffThreshold: 0.5,
          });
        });
      });
    });

    describe('when old screenshot exists', () => {
      describe('when new image has different resolution', () => {
        it('resolves with an error message', async () => {
          const cfg = await generateConfig({ updateImages: false });

          await expect(
            compareImagesTask({ testingType: 'e2e' }, cfg),
          ).resolves.toMatchSnapshot();
        });
      });

      describe('when new image is exactly the same as old one', () => {
        it('resolves with a success message', async () => {
          const cfg = await generateConfig({ updateImages: false });
          await writeTmpFixture(cfg.imgNew, oldImgFixture);

          await expect(
            compareImagesTask({ testingType: 'e2e' }, cfg),
          ).resolves.toMatchSnapshot();
        });
      });
    });
  });
  describe('plugin metadata (FRSOURCE_CPVRD_V) on generated files', () => {
    it('keeps a stamped .actual.png when comparison fails', async () => {
      const cfg = await generateConfig({
        updateImages: false,
        maxDiffThreshold: 0,
      });
      await writeUnstampedFixture(cfg.imgNew, newImgFixture);
      expect(isImageGeneratedByPlugin(readFileSync(cfg.imgNew))).toBe(false);

      const result = await compareImagesTask({ testingType: 'component' }, cfg);

      expect(result).toMatchObject({ error: true });
      expect(existsSync(cfg.imgNew)).toBe(true);
      const actualPng = readFileSync(cfg.imgNew);
      expect(isImageGeneratedByPlugin(actualPng)).toBe(true);
      expect(getPNGMetadata(actualPng)?.testingType).toBe('component');
    });

    // regression test for https://github.com/pixsame/pixsame/issues/322
    it('does not rewrite a baseline that was created from an approved .actual.png', async () => {
      // approveImageTask derives the .diff path from the .actual suffix, so use real-looking names
      const { path: tmpDir } = await dir();
      const cfg = await generateConfig({
        updateImages: false,
        maxDiffThreshold: 0,
        imgNew: await writeUnstampedFixture(
          path.join(tmpDir, 'shot.actual.png'),
          newImgFixture,
        ),
        imgOld: await writeTmpFixture(
          path.join(tmpDir, 'shot.png'),
          oldImgFixture,
        ),
      });

      // 1. comparison fails and leaves .actual.png behind
      expect(
        await compareImagesTask({ testingType: 'e2e' }, cfg),
      ).toMatchObject({ error: true });
      // 2. user approves it (GUI "Replace image" button or manual rename)
      await approveImageTask({ img: cfg.imgNew, imgOld: cfg.imgOld });
      const baselineAfterApprove = readFileSync(cfg.imgOld);
      expect(isImageGeneratedByPlugin(baselineAfterApprove)).toBe(true);

      // 3. next run produces the very same screenshot
      await writeUnstampedFixture(cfg.imgNew, newImgFixture);
      expect(
        await compareImagesTask({ testingType: 'e2e' }, cfg),
      ).toMatchObject({ error: false, imgDiff: 0 });

      // baseline must be left untouched byte-for-byte, .actual.png removed
      expect(readFileSync(cfg.imgOld).equals(baselineAfterApprove)).toBe(true);
      expect(existsSync(cfg.imgNew)).toBe(false);
    });

    describe.each([
      {
        name: 'createMissingImages',
        cfgOverrides: { updateImages: false as const },
        removeBaseline: true,
      },
      {
        name: 'updateImages: true',
        cfgOverrides: { updateImages: true as const },
        removeBaseline: false,
      },
      {
        name: "updateImages: 'failures-only'",
        cfgOverrides: {
          updateImages: 'failures-only' as const,
          maxDiffThreshold: 0,
        },
        removeBaseline: false,
      },
    ])(
      'when baseline is written via $name',
      ({ cfgOverrides, removeBaseline }) => {
        it('stamps the new baseline', async () => {
          const cfg = await generateConfig(cfgOverrides);
          await writeUnstampedFixture(cfg.imgNew, newImgFixture);
          if (removeBaseline) await fs.unlink(cfg.imgOld);

          expect(
            await compareImagesTask({ testingType: 'e2e' }, cfg),
          ).toMatchObject({ error: false });

          expect(existsSync(cfg.imgNew)).toBe(false);
          const baseline = readFileSync(cfg.imgOld);
          expect(isImageGeneratedByPlugin(baseline)).toBe(true);
          expect(getPNGMetadata(baseline)?.testingType).toBe('e2e');
        });
      },
    );
  });

  describe('stale .diff.png from an earlier failed run', () => {
    // real-looking names, so the `.diff.png` sibling is derived like in production
    const shotConfig = async (overrides: Partial<CompareImagesCfg> = {}) => {
      const { path: shots } = await dir();
      const imgNew = path.join(shots, 'home renders_#0.actual.png');
      const cfg = await generateConfig({
        imgNew: await writeTmpFixture(imgNew, oldImgFixture),
        imgOld: await writeTmpFixture(
          path.join(shots, 'home renders_#0.png'),
          oldImgFixture,
        ),
        ...overrides,
      });
      const stale = imgNew.replace('.actual.png', '.diff.png');
      await fs.writeFile(stale, 'stale');
      return { cfg, stale };
    };

    it('is removed when the comparison passes', async () => {
      const { cfg, stale } = await shotConfig();
      await compareImagesTask({ testingType: 'e2e' }, cfg);
      expect(existsSync(stale)).toBe(false);
    });

    it('is removed when the baseline is updated', async () => {
      const { cfg, stale } = await shotConfig({ updateImages: true });
      await compareImagesTask({ testingType: 'e2e' }, cfg);
      expect(existsSync(stale)).toBe(false);
    });

    it("is removed when 'failures-only' replaces the baseline", async () => {
      const { cfg, stale } = await shotConfig({
        updateImages: 'failures-only',
        maxDiffThreshold: 0,
      });
      await fs.copyFile(path.join(fixturesPath, newImgFixture), cfg.imgNew);
      await compareImagesTask({ testingType: 'e2e' }, cfg);
      expect(existsSync(stale)).toBe(false);
    });

    it('is kept (overwritten) when the comparison fails', async () => {
      const { cfg, stale } = await shotConfig({ maxDiffThreshold: 0 });
      await fs.copyFile(path.join(fixturesPath, newImgFixture), cfg.imgNew);
      await compareImagesTask({ testingType: 'e2e' }, cfg);
      expect(existsSync(stale)).toBe(true);
      expect(readFileSync(stale).toString()).not.toBe('stale');
    });
  });
});

describe('doesFileExistsTask', () => {
  it('checks whether file exists', () => {
    expect(doesFileExistTask({ path: 'some/random/path' })).toBe(false);
    expect(
      doesFileExistTask({ path: path.join(fixturesPath, oldImgFixture) }),
    ).toBe(true);
  });
});

describe('pendingDiffs tasks', () => {
  const record = {
    title: 'test title',
    imgPath: 'some/path.png',
    imgOldPath: 'some/old.png',
    imgNewBase64: 'newbase64',
    imgOldBase64: 'oldbase64',
    imgDiffBase64: 'diffbase64',
    message: 'images differ',
  };

  beforeEach(() => {
    clearPendingDiffsTask();
  });

  it('recordPendingDiffTask adds record and returns count', () => {
    expect(recordPendingDiffTask(record)).toBe(1);
    expect(recordPendingDiffTask(record)).toBe(2);
  });

  it('getPendingDiffsTask returns all recorded diffs', () => {
    recordPendingDiffTask(record);
    recordPendingDiffTask({ ...record, title: 'other' });
    const diffs = getPendingDiffsTask();
    expect(diffs).toHaveLength(2);
    expect(diffs[0]).toEqual(record);
    expect(diffs[1].title).toBe('other');
  });

  it('clearPendingDiffsTask empties the list and returns null', () => {
    recordPendingDiffTask(record);
    expect(clearPendingDiffsTask()).toBeNull();
    expect(getPendingDiffsTask()).toHaveLength(0);
  });
});
