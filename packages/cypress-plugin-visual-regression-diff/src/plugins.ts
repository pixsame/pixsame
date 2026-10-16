import { initTaskHook } from './task.hook';
import { initAfterScreenshotHook } from './afterScreenshot.hook';
import {
  getBrowserLaunchPresets,
  initBrowserLaunchHook,
} from './browserLaunch.utils';

export const initPlugin = (
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
) => {
  // one handler serves both presets (forceDeviceScaleFactor, deterministicRendering):
  // Cypress keeps a single listener per event, so they have to share it.
  // With both presets off nothing is registered, so a handler the user registered
  // before initPlugin stays in place (as it did on 1.x with forceDeviceScaleFactor: false)
  const presets = getBrowserLaunchPresets(config);
  if (presets.forceDeviceScaleFactor || presets.deterministicRendering) {
    on('before:browser:launch', initBrowserLaunchHook(config));
  }
  on('task', initTaskHook(config));
  on('after:screenshot', initAfterScreenshotHook(config));
};
