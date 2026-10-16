import { FAB_BADGE_CLASS, FILE_SUFFIX, LINK_PREFIX, TASK } from './constants';
import { supportsExpose } from './version.utils';
import {
  injectDeterministicStyle,
  removeDeterministicStyle,
} from './dom.utils';
import type pixelmatch from 'pixelmatch';
import * as Base64 from '@frsource/base64';
import type { CompareImagesTaskReturn, PendingDiffRecord } from './types';

declare global {
  interface Window {
    /** Number of deferred visual diffs recorded during the current spec run. */
    __cpvrdDeferredCount?: number;
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    type MatchImageOptions = {
      screenshotConfig?: Partial<Cypress.ScreenshotDefaultsOptions>;
      diffConfig?: Parameters<typeof pixelmatch>[5];
      createMissingImages?: boolean;
      updateImages?: boolean | 'failures-only';
      imagesPath?: string;
      maxDiffThreshold?: number;
      forceDeviceScaleFactor?: boolean;
      /**
       * Per call this only controls the CSS injected into the page for the
       * screenshot (caret, animations, scrollbars); the browser switches are
       * process-wide and follow the global `pluginVisualRegressionDeterministicRendering`.
       */
      deterministicRendering?: boolean;
      title?: string;
      matchAgainstPath?: string;
      showPassingImages?: boolean;
      // IDEA: to be implemented if support for files NOT from filesystem needed
      // matchAgainst?: string | Buffer;
    };

    type MatchImageReturn = {
      diffValue: number | undefined;
      imgNewPath: string;
      imgPath: string;
      imgDiffPath: string;
      imgNewBase64: string | undefined;
      imgBase64: string | undefined;
      imgDiffBase64: string | undefined;
      imgNew: InstanceType<Cypress['Buffer']> | undefined;
      img: InstanceType<Cypress['Buffer']> | undefined;
      imgDiff: InstanceType<Cypress['Buffer']> | undefined;
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Chainable<Subject> {
      /**
       * Command to create and compare image snapshots.
       * @memberof Cypress.Chainable
       * @example cy.get('.my-element').matchImage();
       */
      matchImage(
        options?: Cypress.MatchImageOptions,
      ): Chainable<MatchImageReturn>;
    }
  }
}

const constructCypressError = (log: Cypress.Log, err: Error) => {
  // only way to throw & log the message properly in Cypress
  // https://github.com/cypress-io/cypress/blob/5f94cad3cb4126e0567290b957050c33e3a78e3c/packages/driver/src/cypress/error_utils.ts#L214-L216
  (err as unknown as { onFail: (e: Error) => void }).onFail = (err: Error) =>
    log.error(err);
  return err;
};

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const getPluginEnv = <K extends keyof Cypress.MatchImageOptions>(key: K) => {
  const envKey = `pluginVisualRegression${capitalize(key)}`;
  if (supportsExpose(Cypress.version)) {
    return Cypress.expose(envKey) as Cypress.MatchImageOptions[K] | undefined;
  }

  return Cypress.env(envKey) as Cypress.MatchImageOptions[K] | undefined;
};

const booleanOption = <K extends keyof Cypress.MatchImageOptions, Return>(
  options: Cypress.MatchImageOptions,
  key: K,
  truthyValue: Return,
  falsyValue: Return,
) =>
  options[key] === false || getPluginEnv(key) === false
    ? truthyValue
    : falsyValue;

const optionWithDefaults = <K extends keyof Cypress.MatchImageOptions>(
  options: Cypress.MatchImageOptions,
  key: K,
  defaultValue: NonNullable<Cypress.MatchImageOptions[K]>,
) => options[key] ?? getPluginEnv(key) ?? defaultValue;

const getImagesPath = (options: Cypress.MatchImageOptions) =>
  optionWithDefaults(options, 'imagesPath', '{spec_path}/__image_snapshots__');

// opt-in on 1.x (2.0 turns it on by default); `--expose key=true` on the CLI arrives as the string 'true'
const isEnabled = (value: unknown) => value === true || value === 'true';

export const getConfig = (options: Cypress.MatchImageOptions) => ({
  deterministicRendering: isEnabled(
    optionWithDefaults(options, 'deterministicRendering', false),
  ),
  scaleFactor: booleanOption(
    options,
    'forceDeviceScaleFactor',
    1,
    1 / window.devicePixelRatio,
  ),
  createMissingImages: optionWithDefaults(options, 'createMissingImages', true),
  updateImages: optionWithDefaults(options, 'updateImages', false),
  imagesPath: getImagesPath(options),
  maxDiffThreshold: optionWithDefaults(options, 'maxDiffThreshold', 0.01),
  diffConfig: optionWithDefaults(options, 'diffConfig', {}),
  screenshotConfig: optionWithDefaults(options, 'screenshotConfig', {}),
  matchAgainstPath: options.matchAgainstPath || undefined,
});

Cypress.Commands.add(
  'matchImage',
  { prevSubject: 'optional' },
  (subject, options = {}) => {
    const $el = subject as JQuery<HTMLElement> | undefined;
    let title: string;
    /* c8 ignore next */
    let pendingPassingRecord: PendingDiffRecord | null = null;

    const {
      deterministicRendering,
      scaleFactor,
      createMissingImages,
      updateImages,
      imagesPath,
      maxDiffThreshold,
      diffConfig,
      screenshotConfig,
      matchAgainstPath,
    } = getConfig(options);

    // the document of the tested page (AUT), undefined before the first visit
    const autDocument = () =>
      (
        cy as unknown as { state: (s: 'document') => Document | undefined }
      ).state('document');
    const removeStyle = () => {
      const doc = autDocument();
      if (doc) removeDeterministicStyle(doc);
    };
    // a style left behind by an aborted screenshot must never stack up
    removeStyle();

    const test = (
      cy as unknown as {
        state: (s: string) => { id?: string; currentRetry: () => number };
      }
    ).state('test');
    const currentRetryNumber = test.currentRetry();
    // lets the plugin tell a retry of this test apart from the next test
    const testId =
      test.id ??
      [Cypress.spec.relative, ...Cypress.currentTest.titlePath].join(' ');

    return cy
      .then(() =>
        cy.task<{ screenshotPath: string; title: string }>(
          TASK.getScreenshotPathInfo,
          {
            titleFromOptions:
              options.title || Cypress.currentTest.titlePath.join(' '),
            imagesPath,
            specPath: Cypress.spec.relative,
            currentRetryNumber,
            testId,
          },
          { log: false },
        ),
      )
      .then(({ screenshotPath, title: titleFromTask }) => {
        title = titleFromTask;
        let imgPath: string;
        return (($el ? cy.wrap($el) : cy) as Cypress.Chainable<unknown>)
          .screenshot(screenshotPath, {
            ...screenshotConfig,
            onBeforeScreenshot(el) {
              // same phase in which Cypress paints its blackout boxes
              const doc = autDocument();
              if (doc) {
                removeDeterministicStyle(doc);
                if (deterministicRendering) injectDeterministicStyle(doc);
              }
              screenshotConfig.onBeforeScreenshot?.(el);
            },
            onAfterScreenshot(el, props) {
              removeStyle();
              imgPath = props.path;
              screenshotConfig.onAfterScreenshot?.(el, props);
            },
            log: false,
          })
          .then(() => {
            // belt and braces: covers a user hook throwing before ours ran
            removeStyle();
            return cy
              .task<string>(
                TASK.processImgPath,
                { path: imgPath },
                { log: false },
              )
              .then((newImgPath) => {
                imgPath = newImgPath;
                return imgPath;
              });
          });
      })
      .then((imgPath) =>
        cy
          .task<CompareImagesTaskReturn>(
            TASK.compareImages,
            {
              scaleFactor,
              imgNew: imgPath,
              imgOld:
                matchAgainstPath || imgPath.replace(FILE_SUFFIX.actual, ''),
              createMissingImages,
              updateImages,
              maxDiffThreshold,
              diffConfig,
            },
            { log: false },
          )
          .then((res) => ({
            res,
            imgPath,
          })),
      )
      .then(({ res, imgPath }) => {
        const log = Cypress.log({
          name: 'log',
          displayName: 'Match image',
          $el,
        });

        if (!res) {
          log.set('message', 'Unexpected error!');
          throw constructCypressError(log, new Error('Unexpected error!'));
        }

        const imgOldPath =
          matchAgainstPath || imgPath.replace(FILE_SUFFIX.actual, '');

        log.set(
          'message',
          `[${title}] ${res.message}${
            res.imgDiffBase64 && res.imgNewBase64 && res.imgOldBase64
              ? `\n[See comparison](${LINK_PREFIX}${Base64.encode(
                  encodeURIComponent(
                    JSON.stringify({
                      title,
                      imgPath,
                      imgOldPath,
                      imgDiffBase64: res.imgDiffBase64,
                      imgNewBase64: res.imgNewBase64,
                      imgOldBase64: res.imgOldBase64,
                      error: res.error,
                    }),
                  ),
                )})`
              : ''
          }`,
        );

        const matchImageReturn = {
          diffValue: res.imgDiff,
          imgNewPath: imgPath,
          imgPath: imgPath.replace(FILE_SUFFIX.actual, ''),
          imgDiffPath: imgPath.replace(FILE_SUFFIX.actual, FILE_SUFFIX.diff),
          imgNewBase64: res.imgNewBase64,
          imgBase64: res.imgOldBase64,
          imgDiffBase64: res.imgDiffBase64,
          imgNew:
            typeof res.imgNewBase64 === 'string'
              ? Cypress.Buffer.from(res.imgNewBase64, 'base64')
              : undefined,
          img:
            typeof res.imgOldBase64 === 'string'
              ? Cypress.Buffer.from(res.imgOldBase64, 'base64')
              : undefined,
          imgDiff:
            typeof res.imgDiffBase64 === 'string'
              ? Cypress.Buffer.from(res.imgDiffBase64, 'base64')
              : undefined,
        };

        if (res.error) {
          log.set('consoleProps', () => res);

          const deferred = supportsExpose(Cypress.version)
            ? !!Cypress.expose('pluginVisualRegressionBatchReviewMode')
            : !!Cypress.env('pluginVisualRegressionBatchReviewMode');
          const record: PendingDiffRecord = {
            title,
            imgPath,
            imgOldPath,
            imgNewBase64: res.imgNewBase64 ?? '',
            imgOldBase64: res.imgOldBase64 ?? '',
            imgDiffBase64: res.imgDiffBase64 ?? '',
            message: res.message ?? '',
            deferred,
          };

          return cy
            .task<number>(TASK.recordPendingDiff, record, { log: false })
            .then((count) => {
              /* c8 ignore start */
              if (top) {
                const badge = top.document.querySelector(`.${FAB_BADGE_CLASS}`);
                if (badge) {
                  badge.textContent = String(count);
                  (badge as HTMLElement).style.display = 'flex';
                  badge.classList.add(`${FAB_BADGE_CLASS}--pulse`);
                  setTimeout(
                    () => badge.classList.remove(`${FAB_BADGE_CLASS}--pulse`),
                    700,
                  );
                }
                if (deferred) {
                  top.__cpvrdDeferredCount =
                    (top.__cpvrdDeferredCount || 0) + 1;
                }
              }
              /* c8 ignore stop */
              if (!deferred) {
                throw constructCypressError(log, new Error(res.message));
              }
              return matchImageReturn;
            }) as unknown as Cypress.MatchImageReturn;
        }

        /* c8 ignore start */
        if (res.imgDiffBase64 && res.imgNewBase64 && res.imgOldBase64) {
          pendingPassingRecord = {
            title,
            imgPath,
            imgOldPath,
            imgNewBase64: res.imgNewBase64,
            imgOldBase64: res.imgOldBase64,
            imgDiffBase64: res.imgDiffBase64,
            message: res.message ?? '',
            passed: true,
          };
        }
        /* c8 ignore stop */

        return matchImageReturn;
      })
      .then((result) => {
        /* c8 ignore start */
        if (!pendingPassingRecord) return cy.wrap(result, { log: false });
        const record = pendingPassingRecord;
        pendingPassingRecord = null;
        return cy
          .task<number>(TASK.recordPendingDiff, record, { log: false })
          .then(() => result);
        /* c8 ignore stop */
      });
  },
);
