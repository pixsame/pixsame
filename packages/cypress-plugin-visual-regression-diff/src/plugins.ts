import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import {
  getBrowserLaunchPresets,
  initBrowserLaunchHook,
} from './browserLaunch.utils';
import {
  getManifestPath,
  initManifestRun,
  resetManifest,
  setManifestBrowser,
} from './manifest.utils';

export type {
  Manifest,
  ManifestBrowser,
  ManifestCi,
  ManifestEntry,
  ManifestEntryOptions,
  ManifestHashes,
  ManifestImage,
  ManifestPlatform,
  ManifestRenderer,
  ManifestRendererBackend,
  ManifestRunner,
  ManifestStatus,
  ManifestUpload,
} from 'visual-regression-manifest';

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  // Cypress keeps a single listener per event, so the launch presets
  // (forceDeviceScaleFactor, deterministicRendering) and the manifest's record
  // of the launched browser have to share one before:browser:launch handler.
  // With the presets and the manifest all off nothing is registered, so a
  // handler the user registered before initPlugin stays in place (as it did
  // on 1.x with forceDeviceScaleFactor: false)
  const presets = getBrowserLaunchPresets(config);
  const manifestEnabled = getManifestPath(config) !== null;
  if (
    presets.forceDeviceScaleFactor ||
    presets.deterministicRendering ||
    manifestEnabled
  ) {
    const launchHook = initBrowserLaunchHook(config);
    on('before:browser:launch', (browser, launchOptions) => {
      if (manifestEnabled) setManifestBrowser(config, browser);
      return launchHook(browser, launchOptions);
    });
  }
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
  // start every run with a fresh manifest (run mode only; `cypress open` keeps
  // the entries and overwrites them per screenshot)
  on('before:run', (details) => resetManifest(config, details));
  // `before:run` does not fire in `cypress open`, so seed the run data now
  initManifestRun(config);
};
