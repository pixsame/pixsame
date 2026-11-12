const PLUGIN_NAME = 'cp-visual-regression-diff';
export const LINK_PREFIX = `#${PLUGIN_NAME}-`;
export const OVERLAY_CLASS = `${PLUGIN_NAME}-overlay`;
export const FAB_CLASS = `${PLUGIN_NAME}-fab`;
export const FAB_BADGE_CLASS = `${PLUGIN_NAME}-fab-badge`;
export const IMAGE_SNAPSHOT_PREFIX = `__${PLUGIN_NAME}_snapshots__`;

export enum FILE_SUFFIX {
  diff = '.diff',
  actual = '.actual',
}

export const TASK = {
  getScreenshotPathInfo: `${PLUGIN_NAME}-getScreenshotPathInfo`,
  compareImages: `${PLUGIN_NAME}-compareImages`,
  approveImage: `${PLUGIN_NAME}-approveImage`,
  cleanupImages: `${PLUGIN_NAME}-cleanupImages`,
  doesFileExist: `${PLUGIN_NAME}-doesFileExist`,
  processImgPath: `${PLUGIN_NAME}-processImgPath`,
  recordPendingDiff: `${PLUGIN_NAME}-recordPendingDiff`,
  getPendingDiffs: `${PLUGIN_NAME}-getPendingDiffs`,
  clearPendingDiffs: `${PLUGIN_NAME}-clearPendingDiffs`,
  /* c8 ignore next */
};

export const PATH_VARIABLES = {
  specPath: '{spec_path}',
  unixSystemRootPath: '{unix_system_root_path}',
  winSystemRootPath: '{win_system_root_path}',
} as const;

export const WINDOWS_LIKE_DRIVE_REGEX = /^[A-Z]:$/;

export const METADATA_KEY = 'FRSOURCE_CPVRD_V';

export const LS_SHOW_NON_FAILING_DIFFS = 'cp-vrd-show-non-failing-diffs';

/**
 * Chromium switches of the `deterministicRendering` preset: text is rasterised
 * without OS hinting and subpixel tricks, colours are not managed and everything
 * is drawn by the CPU, so screenshots stop depending on the host OS and GPU.
 * Exported so the same list can be handed to Electron via ELECTRON_EXTRA_LAUNCH_ARGS.
 */
export const DETERMINISTIC_RENDERING_CHROMIUM_ARGS = [
  '--font-render-hinting=none',
  '--disable-font-subpixel-positioning',
  '--disable-lcd-text',
  '--force-color-profile=srgb',
  '--disable-gpu',
] as const;
/** Headless-only additions: process-wide, would also strip the runner UI in `cypress open`. */
export const DETERMINISTIC_RENDERING_HEADLESS_CHROMIUM_ARGS = [
  '--hide-scrollbars',
] as const;
export const DETERMINISTIC_RENDERING_FIREFOX_PREFERENCES = {
  'gfx.webrender.software': true,
} as const;

export const FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS = [
  '--force-device-scale-factor=1',
  '--high-dpi-support=1',
] as const;
export const FORCE_DEVICE_SCALE_FACTOR_FIREFOX_PREFERENCES = {
  'layout.css.devPixelsPerPx': '1',
} as const;

/** `<style>` injected into the tested page for the duration of a screenshot. */
export const DETERMINISTIC_RENDERING_STYLE_ID = `${PLUGIN_NAME}-deterministic-rendering`;
export const DETERMINISTIC_RENDERING_CSS = `
*, *::before, *::after {
  caret-color: transparent !important;
  transition: none !important;
  animation: none !important;
  scroll-behavior: auto !important;
}
html, body {
  scrollbar-width: none !important;
}
::-webkit-scrollbar {
  display: none !important;
}
`;
