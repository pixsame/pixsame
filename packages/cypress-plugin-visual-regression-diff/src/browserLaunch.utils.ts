import {
  DETERMINISTIC_RENDERING_CHROMIUM_ARGS,
  DETERMINISTIC_RENDERING_FIREFOX_PREFERENCES,
  DETERMINISTIC_RENDERING_HEADLESS_CHROMIUM_ARGS,
  FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS,
} from './constants';
import { getPluginConfig } from './version.utils';

export type BrowserLaunchPresets = {
  forceDeviceScaleFactor: boolean;
  deterministicRendering: boolean;
};

export const HEADED_ELECTRON_SCALE_FACTOR_MESSAGE =
  "There isn't currently a way of setting the device scale factor in Cypress when running headed electron so we disable the image regression commands.";
export const ELECTRON_DETERMINISTIC_RENDERING_MESSAGE =
  '[@frsource/cypress-plugin-visual-regression-diff] Electron does not accept browser switches from plugins, so the deterministic rendering preset only injects CSS there. Pass the switches via ELECTRON_EXTRA_LAUNCH_ARGS (see "Reducing cross-OS rendering noise" in the README) or use Chrome for CI screenshots.';

/**
 * A boolean plugin option is disabled by `false` or by the string `'false'`
 * (which is what `--expose key=false` on the CLI delivers). Anything else,
 * including "not set", keeps the default (enabled).
 */
export const isOptionDisabled = (
  config: Cypress.PluginConfigOptions,
  key: string,
) => {
  const value = getPluginConfig(config, key);
  return value === false || value === 'false';
};

/**
 * An opt-in plugin option is enabled by `true` or by the string `'true'`
 * (which is what `--expose key=true` on the CLI delivers). Anything else,
 * including "not set", keeps the default (disabled).
 */
export const isOptionEnabled = (
  config: Cypress.PluginConfigOptions,
  key: string,
) => {
  const value = getPluginConfig(config, key);
  return value === true || value === 'true';
};

const pushUnique = (args: string[], toAdd: readonly string[]) => {
  for (const arg of toAdd) if (!args.includes(arg)) args.push(arg);
};

/**
 * Pure part of the `before:browser:launch` hook: returns new launch options
 * with the presets applied and the messages that should be logged.
 * Existing args are never duplicated, so it composes with user handlers.
 */
export const getBrowserLaunchOptions = (
  browser: Cypress.Browser,
  launchOptions: Cypress.BeforeBrowserLaunchOptions,
  presets: BrowserLaunchPresets,
  env: NodeJS.ProcessEnv = process.env,
) => {
  const args = [...launchOptions.args];
  const preferences = { ...launchOptions.preferences };
  const messages: string[] = [];
  const isElectron = browser.name === 'electron';
  // 1.x: the scale factor switches go to Chrome and Chromium only, as they
  // always did on this line. 2.0 widens them to the whole chromium family
  // (Edge) and to Firefox; that changes HiDPI baselines there, so it waits
  // for the major.
  const isChromeOrChromium =
    browser.name === 'chrome' || browser.name === 'chromium';

  if (browser.family === 'chromium' && !isElectron) {
    // based on https://github.com/cypress-io/cypress/issues/2102#issuecomment-521299946
    if (presets.forceDeviceScaleFactor && isChromeOrChromium) {
      pushUnique(args, FORCE_DEVICE_SCALE_FACTOR_CHROMIUM_ARGS);
    }
    if (presets.deterministicRendering) {
      pushUnique(args, DETERMINISTIC_RENDERING_CHROMIUM_ARGS);
      if (browser.isHeadless) {
        pushUnique(args, DETERMINISTIC_RENDERING_HEADLESS_CHROMIUM_ARGS);
      }
    }
  } else if (browser.family === 'firefox') {
    // no scale factor preference on 1.x (2.0 sets layout.css.devPixelsPerPx)
    if (presets.deterministicRendering) {
      Object.assign(preferences, DETERMINISTIC_RENDERING_FIREFOX_PREFERENCES);
    }
  } else if (isElectron) {
    // Electron ignores `args`; only `preferences` (BrowserWindow options) are honoured
    if (presets.forceDeviceScaleFactor && browser.isHeaded) {
      messages.push(HEADED_ELECTRON_SCALE_FACTOR_MESSAGE);
    }
    if (
      presets.deterministicRendering &&
      !(env.ELECTRON_EXTRA_LAUNCH_ARGS ?? '').includes('--font-render-hinting')
    ) {
      messages.push(ELECTRON_DETERMINISTIC_RENDERING_MESSAGE);
    }
  }
  // WebKit: Cypress exposes no switches for it, nothing to do

  return { launchOptions: { ...launchOptions, args, preferences }, messages };
};

export const getBrowserLaunchPresets = (
  config: Cypress.PluginConfigOptions,
): BrowserLaunchPresets => ({
  forceDeviceScaleFactor: !isOptionDisabled(
    config,
    'pluginVisualRegressionForceDeviceScaleFactor',
  ),
  // opt-in on 1.x; 2.0 turns it on by default
  deterministicRendering: isOptionEnabled(
    config,
    'pluginVisualRegressionDeterministicRendering',
  ),
});

/** The single `before:browser:launch` handler registered by the plugin. */
export const initBrowserLaunchHook = (config: Cypress.PluginConfigOptions) => {
  const presets = getBrowserLaunchPresets(config);
  return (
    browser: Cypress.Browser,
    launchOptions: Cypress.BeforeBrowserLaunchOptions,
  ): Cypress.BeforeBrowserLaunchOptions => {
    const { launchOptions: next, messages } = getBrowserLaunchOptions(
      browser,
      launchOptions,
      presets,
    );
    // eslint-disable-next-line no-console
    for (const message of messages) console.log(message);
    return next;
  };
};
