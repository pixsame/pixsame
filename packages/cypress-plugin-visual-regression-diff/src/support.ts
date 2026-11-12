import * as Base64 from '@frsource/base64';
import './commands';
import { supportsExpose } from './version.utils';
import {
  FAB_CLASS,
  FAB_BADGE_CLASS,
  LINK_PREFIX,
  LS_SHOW_NON_FAILING_DIFFS,
  OVERLAY_CLASS,
  TASK,
} from './constants';
import type { PendingDiffRecord } from './types';

const CAROUSEL_CLASS = 'cp-visual-regression-diff-carousel';

const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 72 72"><circle cx="35.5" cy="36.5" r="27.5" fill="#4A4A4D" stroke="#FFF"/><g fill="#FFF" transform="matrix(.075 0 0 .075 16 17)"><circle cx="259.8" cy="259.9" r="80"/><path d="M511.7 237.7C450.2 163.4 357 92 259.8 92 162.5 91.9 69.4 163.4 8 237.7A34.8 34.8 0 0 0 8 282a520.8 520.8 0 0 0 91 86.2c109 79.3 212.4 79.5 321.6 0a520.8 520.8 0 0 0 91-86.2 34.8 34.8 0 0 0 0-44.3zM259.8 148a112.1 112.1 0 0 1 0 224 112.1 112.1 0 0 1 0-224z"/></g></svg>`;

const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

/* c8 ignore start */
function queueClear() {
  (cy as unknown as { queue: { reset: () => void } }).queue.reset?.();
  (cy as unknown as { queue: { clear: () => void } }).queue.clear();
  (cy as unknown as { state: (k: string, value: unknown) => void }).state(
    'index',
    0,
  );
}

function queueRun() {
  // needed to run a task outside of the test processing flow
  (cy as unknown as { queue: { run: () => void } }).queue.run();
}
/* c8 ignore stop */

export const getShowPassingImagesConfig = (): boolean => {
  const key = 'pluginVisualRegressionBatchReviewModeShowPassingImages';
  if (supportsExpose(Cypress.version)) {
    return !!(Cypress.expose(key) as boolean | undefined);
  }
  return !!(Cypress.env(key) as boolean | undefined);
};

export const getBatchReviewMode = (): boolean => {
  const key = 'pluginVisualRegressionBatchReviewMode';
  if (supportsExpose(Cypress.version)) {
    return !!(Cypress.expose(key) as boolean | undefined);
  }
  return !!(Cypress.env(key) as boolean | undefined);
};

export const getEffectiveShowPassingImages = (): boolean => {
  if (!top) return getShowPassingImagesConfig();
  const stored = top.localStorage.getItem(LS_SHOW_NON_FAILING_DIFFS);
  if (stored !== null) return stored === 'true';
  return getShowPassingImagesConfig();
};

export const generateOverlayTemplate = ({
  title,
  imgNewBase64,
  imgOldBase64,
  imgDiffBase64,
  wasImageNotUpdatedYet,
  error,
}: {
  title: string;
  imgNewBase64: string;
  imgOldBase64: string;
  imgDiffBase64: string;
  wasImageNotUpdatedYet: boolean;
  error: boolean;
}) => `<div class="${OVERLAY_CLASS}" style="position:fixed;z-index:100000;top:0;bottom:0;left:0;right:0;display:flex;flex-flow:column;background:#1a202c;font-family:sans-serif">
  <header style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0">
    <div style="display:flex;align-items:center;gap:12px">
      <div style="width:28px;height:28px;flex-shrink:0">${LOGO_SVG}</div>
      <span style="font-weight:600;color:#fff;font-size:.95em">${title} – screenshot diff</span>
    </div>
    <button type="button" data-type="close" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:.85em">✕ Close</button>
  </header>
  <div data-diff-base64="${imgDiffBase64}" style="flex:1;overflow:auto;padding:20px;color:#fff">
    ${generateDiffPanelHTML({ imgNewBase64, imgOldBase64 })}
  </div>
  <div style="background:#1a202c;padding:0 16px 10px;display:flex;justify-content:flex-end;flex-shrink:0">
    <button data-type="see-diff" style="background:#4a5568;border:none;color:#fff;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:.85em">See diff image →</button>
  </div>
  <footer style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0">
    <div></div>
    <div style="display:flex;gap:8px">
      ${
        wasImageNotUpdatedYet
          ? `<button type="button" data-type="replace" style="background:#38a169;border:none;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600">✓ Replace image</button>`
          : error
            ? `<span style="color:#fc8181;font-size:.85em">Image was already updated, rerun test to see new comparison</span>`
            : ''
      }
    </div>
    <div></div>
  </footer>
</div>`;

/* c8 ignore start */
const generateDiffPanelHTML = ({
  imgNewBase64,
  imgOldBase64,
}: Pick<PendingDiffRecord, 'imgNewBase64' | 'imgOldBase64'>) =>
  `<div style="display:flex;justify-content:center;align-items:flex-start;gap:15px;flex-wrap:wrap">
    <div
      style="position:relative;background:#fff;border:solid 15px #fff;overflow:hidden;color:#1a202c"
      onmouseover="this.querySelector('div').style.opacity=0,this.querySelector('img').style.opacity=1"
      onmouseleave="this.querySelector('div').style.opacity=1,this.querySelector('img').style.opacity=0"
    >
      <h3 style="margin:0 0 8px">New screenshot (hover off to see old one):</h3>
      <img style="min-width:200px;max-width:100%;opacity:0" src="data:image/png;base64,${imgNewBase64}" />
      <div style="position:absolute;top:0;left:0;width:100%;background:#fff">
        <h3 style="margin:0 0 8px">Old screenshot (hover to see new one):</h3>
        <img style="min-width:200px;max-width:100%" src="data:image/png;base64,${imgOldBase64}" />
      </div>
    </div>
  </div>`;

const generateFABTemplate = () =>
  `<button class="${FAB_CLASS}" title="Cypress Plugin Visual Regression Diff" style="position:fixed;bottom:20px;right:20px;z-index:99999;width:52px;height:52px;border-radius:50%;border:2px solid rgba(255,255,255,.2);background:#4A4A4D;cursor:pointer;padding:0;box-shadow:0 2px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;overflow:visible;transition:transform .15s">
    <span class="${FAB_BADGE_CLASS}" style="position:absolute;top:-6px;right:-6px;background:#e53e3e;color:#fff;font-size:11px;font-weight:700;min-width:18px;height:18px;border-radius:9px;display:none;align-items:center;justify-content:center;padding:0 4px;box-shadow:0 1px 3px rgba(0,0,0,.4);pointer-events:none"></span>
    <span class="${FAB_CLASS}-logo" style="display:flex;align-items:center;justify-content:center;width:36px;height:36px">${LOGO_SVG}</span>
    <span class="${FAB_CLASS}-check" style="display:none;align-items:center;justify-content:center;width:36px;height:36px">${CHECK_SVG}</span>
  </button>
  <style>
    @keyframes ${FAB_BADGE_CLASS}-pulse {
      0%,100%{transform:scale(1)}
      50%{transform:scale(1.35)}
    }
    .${FAB_BADGE_CLASS}--pulse { animation: ${FAB_BADGE_CLASS}-pulse .5s ease; }
    @keyframes ${FAB_CLASS}-success {
      0%{opacity:0;transform:scale(.5)}
      40%{opacity:1;transform:scale(1.1)}
      100%{opacity:1;transform:scale(1)}
    }
    .${FAB_CLASS}[data-success] .${FAB_CLASS}-logo { display:none!important; }
    .${FAB_CLASS}[data-success] .${FAB_CLASS}-check { display:flex!important; animation:${FAB_CLASS}-success .3s ease forwards; }
    .${FAB_CLASS}:hover { transform:scale(1.08); }
    .${FAB_CLASS}[data-running] { opacity:.45;pointer-events:none; }
    @keyframes ${FAB_CLASS}-attention {
      0%,100%{transform:scale(1)}
      20%{transform:scale(1.18)}
      40%{transform:scale(1)}
      60%{transform:scale(1.12)}
      80%{transform:scale(1)}
    }
    .${FAB_CLASS}--attention { animation:${FAB_CLASS}-attention 1s ease 3; }
  </style>`;

const generateCarouselTemplate = () =>
  `<div class="${CAROUSEL_CLASS}" style="position:fixed;z-index:100000;top:0;bottom:0;left:0;right:0;display:flex;flex-flow:column;background:#1a202c;font-family:sans-serif">
    <header style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:28px;height:28px;flex-shrink:0">${LOGO_SVG}</div>
        <div>
          <span data-carousel-counter style="font-size:.8em;color:#a0aec0;display:block;visibility:hidden">Image</span>
          <span data-carousel-title style="font-weight:600;color:#fff;font-size:.95em;visibility:hidden">placeholder</span>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <label style="display:flex;align-items:center;gap:6px;color:#a0aec0;font-size:.8em;cursor:pointer;user-select:none;white-space:nowrap">
          <input type="checkbox" data-type="show-non-failing" style="cursor:pointer;width:13px;height:13px;flex-shrink:0" />
          Show passing
        </label>
        <button data-type="close" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:.85em">✕ Close</button>
      </div>
    </header>
    <div data-carousel-content style="flex:1;overflow:auto;padding:20px;color:#fff"></div>
    <div data-see-diff-row style="background:#1a202c;padding:0 16px 10px;display:flex;justify-content:flex-end;flex-shrink:0">
      <button data-type="see-diff" style="background:#4a5568;border:none;color:#fff;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:.85em">See diff image →</button>
    </div>
    <footer style="background:#2d3748;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;flex-wrap:wrap">
      <button data-type="prev" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:8px 14px;border-radius:4px;cursor:pointer">← Prev</button>
      <div style="display:flex;gap:8px">
        <button data-type="skip" style="background:#4a5568;border:none;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer">Skip this change →</button>
        <span data-replaced-info style="display:none;align-items:center;color:#68d391;padding:8px 16px;font-size:.9em;font-weight:600">✓ Image was already replaced</span>
        <button data-type="replace" style="background:#38a169;border:none;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;font-weight:600">✓ Replace image</button>
      </div>
      <button data-type="next" style="background:transparent;border:1px solid #4a5568;color:#a0aec0;padding:8px 14px;border-radius:4px;cursor:pointer">Next →</button>
    </footer>
  </div>
  <style>
    .${CAROUSEL_CLASS} button[data-type="prev"]:disabled,
    .${CAROUSEL_CLASS} button[data-type="next"]:disabled {
      opacity:.3;cursor:not-allowed;pointer-events:none;
    }
  </style>`;
/* c8 ignore stop */

/* c8 ignore start */
function showFABSuccess() {
  if (!top) return;
  const fab = top.document.querySelector(`.${FAB_CLASS}`);
  if (!fab) return;
  const badge = fab.querySelector(`.${FAB_BADGE_CLASS}`);
  if (badge) (badge as HTMLElement).style.display = 'none';
  fab.setAttribute('data-success', 'true');
  // Use the top window's timer: the spec iframe (and its timers) is torn down
  // when the spec is rerun, which would leave the FAB stuck in success state.
  top.setTimeout(() => fab.removeAttribute('data-success'), 1800);
}

function pulseFAB() {
  if (!top) return;
  const fab = top.document.querySelector(`.${FAB_CLASS}`);
  if (!fab) return;
  fab.classList.remove(`${FAB_CLASS}--attention`);
  // force reflow so re-adding the class restarts the animation
  void (fab as HTMLElement).offsetWidth;
  fab.classList.add(`${FAB_CLASS}--attention`);
}

function openDiffLightbox(imgBase64: string) {
  if (!top) return;
  Cypress.$(
    `<div style="position:fixed;z-index:200000;top:0;bottom:0;left:0;right:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out">
    <img src="data:image/png;base64,${imgBase64}" style="max-width:95vw;max-height:95vh;object-fit:contain" />
  </div>`,
  )
    .appendTo(top.document.body)
    .on('click', function () {
      Cypress.$(this).remove();
    });
}

function openCarousel(
  initialDiffs: PendingDiffRecord[],
  allDiffs: PendingDiffRecord[] = initialDiffs,
) {
  if (!top) return;

  let diffs = initialDiffs;
  let currentIndex = 0;
  let replacedCount = 0;
  const replacedDiffs = new Set<PendingDiffRecord>();

  const carouselEl = Cypress.$(generateCarouselTemplate()).appendTo(
    top.document.body,
  );

  function renderDiff(index: number) {
    currentIndex = index;
    const diff = diffs[index];
    carouselEl
      .find('[data-carousel-content]')
      .html(generateDiffPanelHTML(diff));
    carouselEl
      .find('[data-carousel-counter]')
      .css('visibility', '')
      .text(`Image ${index + 1} of ${diffs.length}`);
    const passedBadge = diff.passed
      ? ` <span style="background:#38a169;color:#fff;font-size:.7em;padding:2px 7px;border-radius:10px;vertical-align:middle;font-weight:600">passed</span>`
      : '';
    carouselEl
      .find('[data-carousel-title]')
      .css('visibility', '')
      .html(`${diff.title} – screenshot diff${passedBadge}`);
    (carouselEl.find('[data-type="prev"]')[0] as HTMLButtonElement).disabled =
      index === 0;
    (carouselEl.find('[data-type="next"]')[0] as HTMLButtonElement).disabled =
      index === diffs.length - 1;
    const isReplaced = replacedDiffs.has(diff);
    carouselEl.find('[data-type="replace"]').toggle(!isReplaced);
    carouselEl
      .find('[data-replaced-info]')
      .css('display', isReplaced ? 'flex' : 'none');
  }

  function closeCarousel() {
    if (!top) return;
    top.document.removeEventListener('keydown', handleKey);
    carouselEl.remove();
    if (replacedCount > 0) showFABSuccess();
  }

  function advance() {
    if (currentIndex < diffs.length - 1) {
      renderDiff(currentIndex + 1);
    } else {
      closeCarousel();
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (inPlaceholderMode) {
      if (e.key === 'Escape') closeCarousel();
      return;
    }
    if (e.key === 'ArrowLeft' && currentIndex > 0) renderDiff(currentIndex - 1);
    else if (e.key === 'ArrowRight' && currentIndex < diffs.length - 1)
      renderDiff(currentIndex + 1);
    else if (e.key === 'Escape') closeCarousel();
  }

  top.document.addEventListener('keydown', handleKey);

  const showNonFailingCheckbox = carouselEl.find(
    '[data-type="show-non-failing"]',
  )[0] as HTMLInputElement;
  if (showNonFailingCheckbox) {
    showNonFailingCheckbox.checked = getEffectiveShowPassingImages();
  }

  let inPlaceholderMode = false;

  function showPlaceholder() {
    inPlaceholderMode = true;
    carouselEl.find('[data-carousel-content]').html(
      `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#718096;text-align:center;padding:20px">
        <div>
          <p style="margin:0 0 6px;color:#a0aec0;font-size:.95em">No failing images to review.</p>
          <p style="margin:0;font-size:.85em">Enable <strong style="color:#a0aec0">Show passing</strong> to view passing captures.</p>
        </div>
      </div>`,
    );
    carouselEl.find('[data-carousel-counter]').css('visibility', 'hidden');
    carouselEl.find('[data-carousel-title]').css('visibility', 'hidden');
    carouselEl
      .find(
        '[data-see-diff-row],[data-type="skip"],[data-type="replace"],[data-replaced-info],[data-type="prev"],[data-type="next"]',
      )
      .hide();
  }

  function restoreFromPlaceholder() {
    inPlaceholderMode = false;
    carouselEl
      .find(
        '[data-see-diff-row],[data-type="skip"],[data-type="replace"],[data-type="prev"],[data-type="next"]',
      )
      .show();
    renderDiff(currentIndex);
  }

  if (diffs.length === 0) showPlaceholder();
  else renderDiff(0);

  carouselEl.on('change', '[data-type="show-non-failing"]', function (e) {
    if (!top) return;
    const checked = (e.target as HTMLInputElement).checked;
    top.localStorage.setItem(LS_SHOW_NON_FAILING_DIFFS, String(checked));
    if (!checked) {
      const failingDiffs = allDiffs.filter((d) => !d.passed);
      diffs = failingDiffs;
      currentIndex = 0;
      if (failingDiffs.length === 0) showPlaceholder();
      else if (inPlaceholderMode) restoreFromPlaceholder();
      else renderDiff(0);
    } else {
      const passingDiffs = allDiffs.filter((d) => d.passed);
      if (passingDiffs.length > 0) {
        diffs = passingDiffs;
        currentIndex = 0;
        if (inPlaceholderMode) restoreFromPlaceholder();
        else renderDiff(0);
      }
    }
  });

  carouselEl.on('click', '[data-type="close"]', closeCarousel);
  carouselEl.on('click', '[data-type="prev"]', () =>
    renderDiff(currentIndex - 1),
  );
  carouselEl.on('click', '[data-type="next"]', () =>
    renderDiff(currentIndex + 1),
  );
  carouselEl.on('click', '[data-type="skip"]', advance);

  carouselEl.on('click', '[data-type="see-diff"]', () => {
    openDiffLightbox(diffs[currentIndex].imgDiffBase64);
  });

  carouselEl.on('click', '[data-type="replace"]', () => {
    queueClear();
    const diff = diffs[currentIndex];
    cy.task(TASK.approveImage, {
      img: diff.imgPath,
      imgOld: diff.imgOldPath,
      specPath: Cypress.spec.relative,
    }).then(() => {
      replacedCount++;
      replacedDiffs.add(diff);
      advance();
    });
    queueRun();
  });
}

/* c8 ignore stop */

/* c8 ignore start */
before(() => {
  if (!top) return null;
  Cypress.$(`.${OVERLAY_CLASS}`, top.document.body).remove();

  if (getBatchReviewMode()) {
    // Inject the persistent FAB if not already present
    if (!top.document.querySelector(`.${FAB_CLASS}`)) {
      Cypress.$(generateFABTemplate()).appendTo(top.document.body);
    }

    // Reset badge and success state at the start of each spec run
    top.document
      .querySelector(`.${FAB_CLASS}`)
      ?.removeAttribute('data-success');
    const badge = top.document.querySelector(`.${FAB_BADGE_CLASS}`);
    if (badge) {
      (badge as HTMLElement).style.display = 'none';
      badge.textContent = '';
    }

    Cypress.$(top.document.body)
      .off('click', `.${FAB_CLASS}`)
      .on('click', `.${FAB_CLASS}`, () => {
        queueClear();
        cy.task<PendingDiffRecord[]>(TASK.getPendingDiffs, null, {
          log: false,
        }).then((diffs) => {
          const failingDiffs = diffs.filter((d) => !d.passed);
          if (failingDiffs.length > 0) {
            openCarousel(failingDiffs, diffs);
          } else if (getEffectiveShowPassingImages()) {
            const passingDiffs = diffs.filter((d) => d.passed);
            openCarousel(passingDiffs, diffs);
          } else {
            openCarousel([], diffs);
          }
        });
        queueRun();
      });
  }

  // Reset client-side deferred count and clean up artifacts from the previous spec
  if (top) top.__cpvrdDeferredCount = 0;
  cy.task(
    TASK.cleanupImages,
    { specPath: Cypress.spec.relative },
    { log: false },
  );
  cy.task(TASK.clearPendingDiffs, null, { log: false });
});

beforeEach(() => {
  if (!top || !getBatchReviewMode()) return null;
  top.document.querySelector(`.${FAB_CLASS}`)?.setAttribute('data-running', '');
});

afterEach(() => {
  if (!top || !getBatchReviewMode()) return null;
  top.document.querySelector(`.${FAB_CLASS}`)?.removeAttribute('data-running');
});

after(() => {
  if (!top) return null;

  Cypress.$(top.document.body)
    .off('click', `a[href^="${LINK_PREFIX}"]`)
    .on('click', `a[href^="${LINK_PREFIX}"]`, function (e) {
      e.preventDefault();
      if (!top) return false;

      const {
        title,
        imgPath,
        imgOldPath,
        imgDiffBase64,
        imgNewBase64,
        imgOldBase64,
        error,
      } = JSON.parse(
        decodeURIComponent(
          Base64.decode(
            e.currentTarget.getAttribute('href').substring(LINK_PREFIX.length),
          ),
        ),
      );
      queueClear();

      cy.task<boolean>(
        TASK.doesFileExist,
        { path: imgPath },
        { log: false },
      ).then((wasImageNotUpdatedYet) => {
        if (!top) return false;

        Cypress.$(
          generateOverlayTemplate({
            title,
            imgNewBase64,
            imgOldBase64,
            imgDiffBase64,
            error,
            wasImageNotUpdatedYet,
          }),
        ).appendTo(top.document.body);

        const wrapper = Cypress.$(`.${OVERLAY_CLASS}`, top.document.body);
        wrapper.on('click', 'button[data-type="close"]', function () {
          wrapper.remove();
        });

        wrapper.on('click', '[data-type="see-diff"]', function () {
          const base64 =
            wrapper.find('[data-diff-base64]').attr('data-diff-base64') ?? '';
          openDiffLightbox(base64);
        });

        wrapper.on('click', 'button[data-type="replace"]', function () {
          queueClear();

          cy.task(TASK.approveImage, {
            img: imgPath,
            imgOld: imgOldPath,
            specPath: Cypress.spec.relative,
          }).then(() => wrapper.remove());

          queueRun();
        });
      });

      queueRun();

      return false;
    });

  const deferredCount = top?.__cpvrdDeferredCount || 0;
  if (deferredCount > 0) {
    pulseFAB();
    throw new Error(
      `[cypress-plugin-visual-regression-diff] ${deferredCount} image snapshot(s) exceeded the diff threshold. Review the changes using the plugin UI (bottom-right button).`,
    );
  }
});
/* c8 ignore stop */
